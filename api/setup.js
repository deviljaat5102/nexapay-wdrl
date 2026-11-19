export default async function handler(req,res){
 const reply=(status,payload)=>{res.statusCode=status;res.setHeader("content-type","application/json");res.end(JSON.stringify(payload));};
 if(req.method!=="POST")return reply(405,{ok:false,error:"POST required"});
 const token=process.env.BOT_TOKEN,secret=process.env.WEBHOOK_SECRET;
 if(!token||!secret)return reply(500,{ok:false,error:"BOT_TOKEN or WEBHOOK_SECRET missing in Vercel"});
 if(req.headers["x-setup-secret"]!==secret)return reply(401,{ok:false,error:"Secret does not match Vercel WEBHOOK_SECRET"});
 const host=req.headers.host;if(!host)return reply(400,{ok:false,error:"Missing host"});
 const webhookUrl="https://"+host+"/telegram-webhook";
 try{
  const r=await fetch("https://api.telegram.org/bot"+token+"/setWebhook",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:webhookUrl,secret_token:secret,allowed_updates:["message","callback_query"]})});
  const data=await r.json();if(!data.ok)return reply(502,{ok:false,error:data.description||"Telegram rejected webhook"});
  return reply(200,{ok:true,webhook:webhookUrl,telegram:data.description});
 }catch(e){console.error("Setup error:",e);return reply(502,{ok:false,error:"Could not reach Telegram API"});}
}
