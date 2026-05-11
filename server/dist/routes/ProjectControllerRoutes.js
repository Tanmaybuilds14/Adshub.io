"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const ProjectController_1 = require("../controllers/ProjectController");
const multer_1 = __importDefault(require("../configs/multer"));
const ProjectRouter = express_1.default.Router();
ProjectRouter.post('/create', multer_1.default.array('images', 2), auth_1.protect, ProjectController_1.CreateProject);
ProjectRouter.post('/video', auth_1.protect, ProjectController_1.CreateVideo);
ProjectRouter.get('/published', ProjectController_1.getAllPublished);
ProjectRouter.delete('/:projectId', auth_1.protect, ProjectController_1.DeleteProject);
exports.default = ProjectRouter;
//# sourceMappingURL=ProjectControllerRoutes.js.map