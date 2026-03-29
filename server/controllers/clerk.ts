import { Request, Response } from "express";
import { verifyWebhook } from '@clerk/express/webhooks';
import { prisma } from "../configs/prisma.js";

const clerkwebhooks = async (req:Request,res:Response)=>{
  try {
    const evt:any = await verifyWebhook(req);
    const {data,type} = evt;
    console.log(`[Webhook] Received event type: ${type}`, JSON.stringify(data, null, 2));
    
    switch(type){

      case "user.created":{
        console.log(`[Webhook] Creating user: ${data.id}`);
        await prisma.user.create({
          data:{
            id:data.id,
            email:data?.email_addresses[0]?.email_address || "no-email",
            name:(data?.first_name || "") +" "+ (data?.last_name || ""),
            image:data?.image_url || "",
          }
        })
        console.log(`[Webhook] User created successfully: ${data.id}`);
        break;
      }

      case "user.updated":{
        console.log(`[Webhook] Updating user: ${data.id}`);
        await prisma.user.update({
          where:{
            id:data.id
          },
          data:{
            email:data?.email_addresses[0]?.email_address,
            name:(data?.first_name || "") +" "+ (data?.last_name || ""),
            image:data?.image_url,
          }
        })
        console.log(`[Webhook] User updated successfully: ${data.id}`);
        break;
      }

      case "user.deleted":{
        console.log(`[Webhook] Deleting user: ${data.id}`);
        await prisma.user.delete({
          where:{
            id:data.id
          }
        })
        console.log(`[Webhook] User deleted successfully: ${data.id}`);
        break;
      }

      case "paymentAttempt.updated":{
        console.log(`[Webhook] Payment attempt update:`, JSON.stringify(data, null, 2));
        if((data.charge_type === "recurring" || data.charge_type === "checkout") && data.status === "paid"){
          const credits = {pro:80, premium:240}
          const clerkUserId = data?.payer?.user_id;
          const planId : keyof typeof credits = data?.subscription_items?.[0]?.plan?.slug

          console.log(`[Webhook] Payment details - UserId: ${clerkUserId}, PlanId: ${planId}`);

          if(!clerkUserId){
            console.log(`[Webhook] ERROR: No user ID found in payment data`);
            return res.status(400).json({msg:"No user ID in payment"})
          }

          if(planId && (planId === "pro" || planId === "premium")){
            const creditAmount = credits[planId];
            console.log(`[Webhook] Adding ${creditAmount} credits to user ${clerkUserId}`);
            
            await prisma.user.update({
              where:{id:clerkUserId},
              data:{
                credits:{increment:creditAmount}
              }
            })
            console.log(`[Webhook] Credits added successfully for user ${clerkUserId}`);
          } else {
            console.log(`[Webhook] Invalid or missing plan: ${planId}`);
          }
        } else {
          console.log(`[Webhook] Payment not paid or invalid charge type. Status: ${data.status}, Type: ${data.charge_type}`);
        }
      }
      break;

      default:
        console.log(`[Webhook] Unhandled event type: ${type}`);
        break
    }

    res.json({msg:"Webhook Received:"+type})
  } catch (error:any) {
    console.error(`[Webhook] Error processing webhook:`, error);
    res.status(500).json({msg:error.message})
  }

}

export default clerkwebhooks 