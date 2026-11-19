const API="https://api.telegram.org";
async function tg(method,token,body){
 const r=await fetch(API+"/bot"+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 const d=await r.json(); if(!d.ok) throw new Error(d.description||"Telegram API error"); return d.result;
}
function userName(m){
 const o=m.forward_origin;
 if(o?.type==="user"){const u=o.sender_user;return [u.first_name,u.last_name].filter(Boolean).join(" ")||"Hidden User";}
 const s=m.caption||m.text||""; const x=s.match(/(?:user|name)\s*[:：-]\s*([^\n]+)/i); return x?.[1]?.trim()||"Hidden User";
}
function amount(m){
 const s=m.caption||m.text||""; const x=s.match(/(?:₹|rs\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i); return x?"₹"+x[1]:"Not provided";
}
export async function POST(request){
 const token=process.env.BOT_TOKEN, channel=process.env.CHANNEL_ID, secret=process.env.WEBHOOK_SECRET;
 if(!token||!channel||!secret) return Response.json({ok:false,error:"Bot environment variables missing"},{status:500});
 if(request.headers.get("x-telegram-bot-api-secret-token")!==secret) return Response.json({ok:false},{status:401});
 try{
  const update=await request.json();
  if(update.callback_query){
   const q=update.callback_query;
   if(q.data==="privacy_hidden") await tg("answerCallbackQuery",token,{callback_query_id:q.id,text:"Account has been hidden",show_alert:true});
   return Response.json({ok:true});
  }
  const m=update.message;
  if(!m) return Response.json({ok:true});
  if(m.chat?.type==="private"&&m.text?.startsWith("/start")){
   await tg("sendMessage",token,{chat_id:m.chat.id,text:"Welcome to NEXAPAY WDRL. Forward a withdrawal screenshot here for admin review."});
   return Response.json({ok:true});
  }
  const photo=m.photo?.at(-1);
  if(m.chat?.type!=="private"||!photo){
   if(m.chat?.type==="private") await tg("sendMessage",token,{chat_id:m.chat.id,text:"Please forward a message containing a withdrawal screenshot."});
   return Response.json({ok:true});
  }
  const name=userName(m), amt=amount(m);
  const caption=["💸 WITHDRAWAL VERIFICATION","📸 Proof Submitted","━━━━━━━━━━━━━━━━","💰 Amount: "+amt,"👤 User: "+name,"🕒 Status: Pending Verification","━━━━━━━━━━━━━━━━","🔎 Please review the submitted proof and verify the withdrawal.","","🤖 NEXAPAY WDRL Automated Posting System"].join("\n");
  await tg("sendPhoto",token,{chat_id:channel,photo:photo.file_id,caption,reply_markup:{inline_keyboard:[[{text:name,callback_data:"privacy_hidden"}]]}});
  await tg("sendMessage",token,{chat_id:m.chat.id,text:"✅ Screenshot posted to the channel for admin review."});
  return Response.json({ok:true});
 }catch(e){console.error("Webhook error:",e);return Response.json({ok:false},{status:500});}
}
