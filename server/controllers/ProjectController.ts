import { Request, Response } from "express";
import * as Sentry from  '@sentry/node';
import { prisma } from "../configs/prisma.js";
import {v2 as cloudinary} from 'cloudinary'
import { GenerateContentConfig , HarmBlockThreshold , HarmCategory} from "@google/genai";
import fs from 'fs';
import ai from "../configs/ai.js";
import path from 'path'
import axios from 'axios';

const loadimage = (path:string , mimeType:string) =>{
  return{
    inlineData:{
      data:fs.readFileSync(path).toString('base64'),
      mimeType
    }
  }
}

export const CreateProject = async(req:Request,res:Response)=>{
  let tempProjectId:string;
  const {userId} = req.auth();
  let isCreditDeducted = false;

  const {name = 'New project', aspectRatio, userPrompt, productName, productDescription, targetLength=5} = req.body;

  const images:any = req.files;
  if(images.length<2||!productName){
    return res.status(400).json({msg:'Please upload at least 2 images'})
  }

  const user = await prisma.user.findUnique({
    where:{id:userId}
  })


  if(!user || user.credits<5){
    return res.status(401).json({msg:'Insufficient credits'});
  }else{
    await prisma.user.update({
      where:{id:userId},
      data:{credits:{decrement:5}}
    }).then(()=>{isCreditDeducted = true})
  }
  try {
    let uploadedImages = await Promise.all(
      images.map(async(item:any)=>{
        let result  = await cloudinary.uploader.upload(item.path,
          {resource_type:'image'}          
        )
        return result.secure_url
      })
    ) 
    
    const project = await prisma.project.create({
      data:{
        name,
        userId,
        productName,
        productDescription,
        userPrompt,
        aspectRatio,
        targetLength:parseInt(targetLength),
        uploadedImages,
        isGenerating:true
      }
    })

    tempProjectId = project.id;
    
    const model  = 'gemini-3.1-flash-image-preview';

    const generationConfig: GenerateContentConfig = {
      maxOutputTokens:1024,
      temperature:1,
      topP:0.95,
      responseModalities:['IMAGE'],
      imageConfig:{
        aspectRatio:aspectRatio||'9:16',
        imageSize:'1k'
      },
      safetySettings:[
        {
          category:HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold:HarmBlockThreshold.OFF,
        },
        {
          category:HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold:HarmBlockThreshold.OFF,
        },
        {
          category:HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold:HarmBlockThreshold.OFF,
        },
        {
          category:HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold:HarmBlockThreshold.OFF,
        },
      ]
    }

    //image to base64 structure for ai model

    const img1base64 = loadimage(images[0].path , images[0].mimeType);
    const img2base64 = loadimage(images[1].path , images[1].mimeType);

    const prompt = {
      text:`combine the person and product inta a realistic photo. make the person naturally hold or use the product.
      Match the ligthting, shadows, scale and prespective.
      Make the person stand in professional studio lighting,
      Output eccommerce-qaulity photo realistic imagery.${userPrompt}`
    }

    //Generate the image using ai model
    const response:any = await ai.models.generateContent({
      model,
      contents:[img1base64,img2base64,prompt],
      config:generationConfig
    })

    //check if the response is valid
    if(!response?.candidates?.[0].content?.parts){
      throw new Error('Unexpected response')
    }

    const parts = response.candiadtes[0].content.parts;

    let finalbuffer: Buffer | null = null

    for(const part of parts){
      if(part.inlineData){
        finalbuffer = Buffer.from(part.inlineData.data, 'base64')
      }
    }

    if(!finalbuffer){
      throw new Error('Failed to generate image');
    }

    const base64Image = `data:image/png;base64,${finalbuffer.toString('base64')}`

    const uploadresult = await cloudinary.uploader.upload(base64Image,{resource_type:'image'})

    await prisma.project.update({
      where:{id:project.id},
      data:{
        generatedImage:uploadresult.secure_url,
        isGenerating:false,

      }
    })

    res.json({projectId: project.id})

  } catch (error:any) {
    if(tempProjectId!){
      await prisma.project.update({
        where:{id:tempProjectId},
        data:{isGenerating:false , error : error.message},
      })
    }

    if(isCreditDeducted){
      await prisma.user.update({
        where:{id:userId},
        data:{credits:{increment:5}},
      })
    }
    Sentry.captureException(error);
    res.status(500).json({msg:error.message})
  }

}

export const getAllPublished = async(req:Request,res:Response)=>{
  try {
    const projects = await prisma.project.findMany({
      where:{isPublished:true}
    })
    res.json({projects})

  } catch (error:any) {
    Sentry.captureException(error);
    res.status(500).json({msg:error.message})
  }

}

export const CreateVideo = async(req:Request,res:Response)=>{
  const {userId} = req.auth()
  const {projectId} = req.body;
  let isCreditDeducted = false;

  const user = await prisma.user.findUnique({
    where:{id:userId}
  })

  if(!user || user.credits < 10){
    return res.status(401).json({message:'Incufficient credits'});
  }
  
  //deduct credits for video generation
  await prisma.user.update({
    where:{id : userId},
    data:{credits: {decrement:10}},
  }).then(()=>{isCreditDeducted = true});

  try {
    const project = await prisma.project.findUnique({
      where:{id : projectId, userId},
      include: {user:true},
    })

    if(!project || project.isGenerating){
      return res.status(401).json({message:'Generation in progress'});
    }

    if(project.generatedVideo){
      return res.status(404).json({message:'video is already generated'})
    }

    await prisma.project.update({
      where:{id: projectId},
      data:{isGenerating:true},
    })

    const prompt = `make the person showcase the product which is ${project.productName} ${project.productDescription && `and Product Description: ${project.productDescription}`}`
    
    const model = 'veo-3.1-generate-preview';

    if(!project.generatedImage){
      throw new Error('Generated image not found')
    }
    
    const image = await axios.get(project.generatedImage, {responseType:'arraybuffer',})

    const imageBytes: any = Buffer.from(image.data)

    let operation:any = await ai.models.generateVideos({
      model,
      prompt,
      image:{
        imageBytes:imageBytes.toString('base64'),
        mimeType:'image/png',
      },
      config:{
        aspectRatio:project?.aspectRatio || '9:16',
        numberOfVideos:1,
        resolution:'720p',
      }
    })

    while(!operation.done){
      console.log('Waiting for cideo generation to compelete...');
      await new Promise((resolve)=>setTimeout(resolve,10000));
      operation = await ai.operations.getVideosOperation({
        operation:operation,
      })
    }

    const filename = `${userId}-${Date.now()}.mp4`;
    const filepath = path.join('videos',filename)

    fs.mkdirSync('videos',{recursive:true})

    if(!operation.response.generateVideos){
      throw new Error(operation.response.raimediafilteredReasons[0])
    }

    await ai.files.download({
      file: operation.response.generateVideos[0].video,
      downloadPath:filepath
    })

    const uploadresult = await cloudinary.uploader.upload(filepath, {
      resource_type:'video'
    });

    await prisma.project.update({
      where:{id:project.id},
      data:{
        generatedVideo:uploadresult.secure_url,
        isGenerating:false
      }
    })

    fs.unlinkSync(filepath);

    res.json({message:'video generation completed', VideoUrl:uploadresult.secure_url})
  }catch (error:any) {

    await prisma.project.update({
      where:{id:projectId,userId},
      data:{isGenerating:false , error:error.message}
    })

    if(isCreditDeducted){

      await prisma.user.update({
        where:{id:userId},
        data:{credits:{increment:10}}
      })
    }

    Sentry.captureException(error);
    res.status(500).json({msg:error.message})
  }

}

export const DeleteProject = async(req:Request,res:Response)=>{
  try {
    const {userId} = req.auth();
    const {projectId} = req.params;

    const project = await prisma.project.findUnique({
      where:{id: projectId.toString() , userId}
    })

    if(!project){
      return res.status(404).json({message:'Project not found'});
    }

    await prisma.project.delete({
      where:{id:projectId.toString()}
    })

    res.json({message:'project deleted successfully!!'})
  } catch (error:any) {
    Sentry.captureException(error);
    res.status(500).json({msg:error.message})
  }

}