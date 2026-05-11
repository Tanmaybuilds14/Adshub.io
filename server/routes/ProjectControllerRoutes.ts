import express from "express";
import { protect } from "../middlewares/auth";
import { CreateProject, CreateVideo, DeleteProject, getAllPublished } from "../controllers/ProjectController";
import upload from "../configs/multer";

const ProjectRouter = express.Router();

ProjectRouter.post('/create', upload.array('images',2) ,protect,CreateProject);
ProjectRouter.post('/video',protect,CreateVideo);
ProjectRouter.get('/published',getAllPublished);
ProjectRouter.delete('/:projectId',protect,DeleteProject);

export default ProjectRouter;


