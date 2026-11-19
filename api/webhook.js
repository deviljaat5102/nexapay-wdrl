const API="https://api.telegram.org";
async function tg(method,token,body){
 const r=await fetch(API+"/bot"+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 const d=await r.json(); if(!d.ok) throw new Error(d.description||"Telegram API error"); return d.result;
}
function reply(res,status,payload){res.statusCode=status;res.setHeader("content-type","application/json");res.end(JSON.stringify(payload));}
function userName(m){
 const o=m.forward_origin;
 if(o?.type==="user"){
  const u=o.sender_user;
  return [u.first_name,u.last_name].filter(Boolean).join(" ")||u.username||"Hidden User";
 }
 if(o?.type==="hidden_user" && o.sender_user_name) return o.sender_user_name;
 if(m.forward_sender_name) return m.forward_sender_name;
 const s=m.caption||m.text||"";
 const x=s.match(/(?:user|name)\s*[:：-]\s*([^\n]+)/i);
 return x?.[1]?.trim()||"Hidden User";
}
function amount(m){const s=m.caption||m.text||"";const x=s.match(/(?:₹|rs\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i);return x?"₹"+x[1]:"Not provided";}
export default async function handler(req,res){
 if(req.method!=="POST")return reply(res,405,{ok:false,error:"POST required"});
 const token=process.env.BOT_TOKEN,channel=process.env.CHANNEL_ID,secret=process.env.WEBHOOK_SECRET;
 if(!token||!channel||!secret)return reply(res,500,{ok:false,error:"Bot environment variables missing"});
 if(req.headers["x-telegram-bot-api-secret-token"]!==secret)return reply(res,401,{ok:false});
 try{
  const update=req.body||{};
  if(update.callback_query){const q=update.callback_query;if(q.data==="privacy_hidden")await tg("answerCallbackQuery",token,{callback_query_id:q.id,text:"Account has been hidden",show_alert:true});return reply(res,200,{ok:true});}
  const m=update.message;if(!m)return reply(res,200,{ok:true});
  if(m.chat?.type==="private"&&m.text?.startsWith("/start")){await tg("sendMessage",token,{chat_id:m.chat.id,text:"Welcome to NEXAPAY WDRL. Forward a withdrawal screenshot here for admin review."});return reply(res,200,{ok:true});}
  const photo=m.photo?.at(-1);
  if(m.chat?.type!=="private"||!photo){if(m.chat?.type==="private")await tg("sendMessage",token,{chat_id:m.chat.id,text:"Please forward a message containing a withdrawal screenshot."});return reply(res,200,{ok:true});}
  const amt=amount(m);
  // Native Telegram forwarding gives the exact "Forwarded from [name]" header.
  await tg("forwardMessage",token,{
    chat_id:channel,
    from_chat_id:m.chat.id,
    message_id:m.message_id
  });
  const caption=["💸 WITHDRAWAL VERIFICATION","📸 Proof Submitted","━━━━━━━━━━━━━━━━","💰 Amount: "+amt,"🕒 Status: Pending Verification","━━━━━━━━━━━━━━━━","🔎 Please review the submitted proof and verify the withdrawal.","","🤖 NEXAPAY WDRL Automated Posting System"].join("\n");
  await tg("sendMessage",token,{chat_id:channel,text:caption});
  await tg("sendMessage",token,{chat_id:m.chat.id,text:"✅ Screenshot posted to the channel for admin review."});
  return reply(res,200,{ok:true});
 }catch(e){console.error("Webhook error:",e);return reply(res,500,{ok:false});}
}
