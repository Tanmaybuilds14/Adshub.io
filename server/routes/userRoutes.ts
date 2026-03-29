import express from 'express';
import { getAllProjects, getProjectById, getUserCredits, toggleProjectPublic } from '../controllers/UserControler.js';
import { protect } from '../middlewares/auth.js';
import { prisma } from '../configs/prisma.js';

const userRouter = express.Router();

userRouter.get('/credits', protect ,getUserCredits);
userRouter.get('/projects', protect ,getAllProjects);
userRouter.get('/projects/:projectId', protect ,getProjectById);
userRouter.get('/publish/:projectId', protect ,toggleProjectPublic);

// Test endpoint to manually add credits (remove in production)
userRouter.post('/test-add-credits/:amount', protect, async (req, res) => {
  try {
    const {userId} = req.auth();
    const {amount} = req.params;
    const creditsToAdd = parseInt(amount.toString());
    
    console.log(`[Test] Adding ${creditsToAdd} credits to user ${userId}`);
    
    const user = await prisma.user.update({
      where:{id:userId},
      data:{
        credits:{increment:creditsToAdd}
      }
    });
    
    console.log(`[Test] Updated user credits to ${user.credits}`);
    res.json({success:true, credits:user.credits, msg:`Added ${creditsToAdd} credits`})
  } catch (error:any) {
    console.error('[Test] Error:', error.message);
    res.status(500).json({msg:error.message})
  }
});

export default userRouter;