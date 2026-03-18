import { Request, Response } from "express";
import * as Sentry from '@sentry/node';

//get user credits
export const getUserCredits = async (req:Request,res:Response) =>{
  try {
    
  } catch (error:any) {
    Sentry.captureException(error);
    res.status(500).json({msg:error.code || error.message})
  }
}

export const getAllProjects = async (req:Request,res:Response) =>{
  try {
    
  } catch (error:any) {
    Sentry.captureException(error);
    res.status(500).json({msg:error.code || error.message})
  }
}