import { Request , Response , NextFunction } from "express"
import * as Sentry from '@sentry/node'; 


export const protect = async (req:Request , res:Response , next:NextFunction) =>{
 try {
   const {userId} = req.auth()
   if(!userId){
    return res.status(400).json({msg:'Unauthorized'})
   }
   next()
 } catch (error:any) {
  Sentry.captureException(error);
   res.status(401).json({msg:error.code || error.message})
 }
}