import express from "express";
import { protect } from "../middlewares/auth.js";
import { CreateProject, CreateVideo, DeleteProject, getAllPublished } from "../controllers/ProjectController.js";
import upload from "../configs/multer.js";

const ProjectRouter = express.Router();

ProjectRouter.post('/create', upload.array('images',2) ,protect,CreateProject);
ProjectRouter.post('/video',protect,CreateVideo);
ProjectRouter.post('/publisheb',protect,getAllPublished);
ProjectRouter.post('/:projectId',protect,DeleteProject);

export default ProjectRouter;


