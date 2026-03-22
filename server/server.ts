import "./configs/instrument.js";
import express from 'express'
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express'
import clerkwebhooks from './controllers/clerk.js';
import * as Sentry from '@sentry/node';
import userRouter from "./routes/userRoutes.js";
import ProjectRouter from "./routes/ProjectControllerRoutes.js";


const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.post('/api/clerk' ,express.raw({type:'application/json'}), clerkwebhooks)
app.use(express.json());
app.use(clerkMiddleware());

app.get('/',(req,res)=>{
  res.send('server is live');
});

app.get('/debug-sentry', function mainHandler(req,res){
  throw new Error("My first sentry error!");
});

app.use('/api/user',userRouter);
app.use('/api/project',ProjectRouter);

Sentry.setupExpressErrorHandler(app);

app.listen(PORT,()=>{
  console.log(`server is running at http://localhost:${PORT}`)
});