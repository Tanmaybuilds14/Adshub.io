import type React from "react";

export interface UploadZoneprops{
  label:string;
  file:File|null;
  onClear:()=>void;
  onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;
}

export interface User{
  id?:string;
  name?:string;
  email?:string;
}

export interface Project{
  id:string;
  userId?:string;
  productName:string;
  productDescription?:string;
  userPrompt?:string;
  aspectRatio:string;
  targetLenght?:string;
  generatedImage?:string;
  generatedVideo?:string;
  isGenerating:boolean;
  isPublished:boolean;
  error?:string;
  createdAt:Date|string;
  updatedAt:Date|string;
  uploadedImages:string[];
}