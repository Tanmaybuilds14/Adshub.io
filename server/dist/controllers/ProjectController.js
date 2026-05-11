"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteProject = exports.CreateVideo = exports.getAllPublished = exports.CreateProject = void 0;
const Sentry = __importStar(require("@sentry/node"));
const prisma_1 = require("../configs/prisma");
const cloudinary_1 = require("cloudinary");
const genai_1 = require("@google/genai");
const ai_1 = __importDefault(require("../configs/ai"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const loadimage = (buffer, mimeType) => {
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType
        }
    };
};
const CreateProject = async (req, res) => {
    let tempProjectId;
    const { userId } = req.auth();
    let isCreditDeducted = false;
    const { name = 'New project', aspectRatio, userPrompt, productName, productDescription, targetLength = 5 } = req.body;
    const images = req.files;
    if (images.length < 2 || !productName) {
        return res.status(400).json({ msg: 'Please upload at least 2 images' });
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user || user.credits < 5) {
        return res.status(403).json({ msg: 'Insufficient credits' });
    }
    else {
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 5 } }
        }).then(() => { isCreditDeducted = true; });
    }
    try {
        let uploadedImages = await Promise.all(images.map(async (item) => {
            const b64 = item.buffer.toString('base64');
            const dataUri = `data:${item.mimetype};base64,${b64}`;
            let result = await cloudinary_1.v2.uploader.upload(dataUri, { resource_type: 'image' });
            return result.secure_url;
        }));
        const project = await prisma_1.prisma.project.create({
            data: {
                name,
                userId,
                productName,
                productDescription,
                userPrompt,
                aspectRatio,
                targetLength: parseInt(targetLength),
                uploadedImages,
                isGenerating: true
            }
        });
        tempProjectId = project.id;
        const model = 'gemini-3.1-flash-image-preview';
        const generationConfig = {
            maxOutputTokens: 1024,
            temperature: 1,
            topP: 0.95,
            responseModalities: ['IMAGE'],
            imageConfig: {
                aspectRatio: aspectRatio || '9:16',
                imageSize: '1k'
            },
            safetySettings: [
                {
                    category: genai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: genai_1.HarmBlockThreshold.OFF,
                },
                {
                    category: genai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: genai_1.HarmBlockThreshold.OFF,
                },
                {
                    category: genai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: genai_1.HarmBlockThreshold.OFF,
                },
                {
                    category: genai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: genai_1.HarmBlockThreshold.OFF,
                },
            ]
        };
        //image to base64 structure for ai model
        const img1base64 = loadimage(images[0].buffer, images[0].mimetype);
        const img2base64 = loadimage(images[1].buffer, images[1].mimetype);
        const prompt = {
            text: `combine the person and product into a realistic photo. make the person naturally hold or use the product.
      Match the lighting, shadows, scale and perspective.
      Make the person stand in professional studio lighting,
      Output ecommerce-quality photo realistic imagery.${userPrompt}`
        };
        //Generate the image using ai model
        const response = await ai_1.default.models.generateContent({
            model,
            contents: [img1base64, img2base64, prompt],
            config: generationConfig
        });
        //check if the response is valid
        if (!response?.candidates?.[0].content?.parts) {
            throw new Error('Unexpected response');
        }
        const parts = response.candidates[0].content.parts;
        let finalbuffer = null;
        for (const part of parts) {
            if (part.inlineData) {
                finalbuffer = Buffer.from(part.inlineData.data, 'base64');
            }
        }
        if (!finalbuffer) {
            throw new Error('Failed to generate image');
        }
        const base64Image = `data:image/png;base64,${finalbuffer.toString('base64')}`;
        const uploadresult = await cloudinary_1.v2.uploader.upload(base64Image, { resource_type: 'image' });
        await prisma_1.prisma.project.update({
            where: { id: project.id },
            data: {
                generatedImage: uploadresult.secure_url,
                isGenerating: false,
            }
        });
        res.json({ projectId: project.id });
    }
    catch (error) {
        if (tempProjectId) {
            await prisma_1.prisma.project.update({
                where: { id: tempProjectId },
                data: { isGenerating: false, error: error.message },
            });
        }
        if (isCreditDeducted) {
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } },
            });
        }
        Sentry.captureException(error);
        res.status(500).json({ msg: error.message });
    }
};
exports.CreateProject = CreateProject;
const getAllPublished = async (req, res) => {
    try {
        const projects = await prisma_1.prisma.project.findMany({
            where: { isPublished: true }
        });
        res.json({ projects });
    }
    catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ msg: error.message });
    }
};
exports.getAllPublished = getAllPublished;
const CreateVideo = async (req, res) => {
    const { userId } = req.auth();
    const { projectId } = req.body;
    let isCreditDeducted = false;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user || user.credits < 10) {
        return res.status(403).json({ message: 'Insufficient credits' });
    }
    //deduct credits for video generation
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 10 } },
    }).then(() => { isCreditDeducted = true; });
    try {
        const project = await prisma_1.prisma.project.findUnique({
            where: { id: projectId, userId },
            include: { user: true },
        });
        if (!project || project.isGenerating) {
            return res.status(401).json({ message: 'Generation in progress' });
        }
        if (project.generatedVideo) {
            return res.status(409).json({ message: 'video is already generated' });
        }
        await prisma_1.prisma.project.update({
            where: { id: projectId },
            data: { isGenerating: true },
        });
        const prompt = `make the person showcase the product which is ${project.productName} ${project.productDescription && `and Product Description: ${project.productDescription}`}`;
        const model = 'veo-3.1-generate-preview';
        if (!project.generatedImage) {
            throw new Error('Generated image not found');
        }
        const image = await axios_1.default.get(project.generatedImage, { responseType: 'arraybuffer', });
        const imageBytes = Buffer.from(image.data);
        let operation = await ai_1.default.models.generateVideos({
            model,
            prompt,
            image: {
                imageBytes: imageBytes.toString('base64'),
                mimeType: 'image/png',
            },
            config: {
                aspectRatio: project?.aspectRatio || '9:16',
                numberOfVideos: 1,
                resolution: '720p',
            }
        });
        while (!operation.done) {
            console.log('Waiting for video generation to complete...');
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await ai_1.default.operations.getVideosOperation({
                operation: operation,
            });
        }
        const filename = `${userId}-${Date.now()}.mp4`;
        const filepath = path_1.default.join('videos', filename);
        fs_1.default.mkdirSync('videos', { recursive: true });
        if (!operation.response.generateVideos) {
            throw new Error(operation.response.raimediafilteredReasons[0]);
        }
        await ai_1.default.files.download({
            file: operation.response.generateVideos[0].video,
            downloadPath: filepath
        });
        const uploadresult = await cloudinary_1.v2.uploader.upload(filepath, {
            resource_type: 'video'
        });
        await prisma_1.prisma.project.update({
            where: { id: project.id },
            data: {
                generatedVideo: uploadresult.secure_url,
                isGenerating: false
            }
        });
        fs_1.default.unlinkSync(filepath);
        res.json({ message: 'video generation completed', VideoUrl: uploadresult.secure_url });
    }
    catch (error) {
        await prisma_1.prisma.project.update({
            where: { id: projectId, userId },
            data: { isGenerating: false, error: error.message }
        });
        if (isCreditDeducted) {
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 10 } }
            });
        }
        Sentry.captureException(error);
        res.status(500).json({ msg: error.message });
    }
};
exports.CreateVideo = CreateVideo;
const DeleteProject = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { projectId } = req.params;
        const project = await prisma_1.prisma.project.findUnique({
            where: { id: projectId.toString(), userId }
        });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        await prisma_1.prisma.project.delete({
            where: { id: projectId.toString() }
        });
        res.json({ message: 'project deleted successfully!!' });
    }
    catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ msg: error.message });
    }
};
exports.DeleteProject = DeleteProject;
//# sourceMappingURL=ProjectController.js.map