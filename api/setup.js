export async function POST(request) {
  const token = process.env.BOT_TOKEN;
  const secret = process.env.WEBHOOK_SECRET;
  if (!token || !secret) return Response.json({ok:false,error:"BOT_TOKEN or WEBHOOK_SECRET missing"}, {status:500});
  if (request.headers.get("x-setup-secret") !== secret) return Response.json({ok:false,error:"Secret does not match Vercel WEBHOOK_SECRET"}, {status:401});
  const host = request.headers.get("host");
  if (!host) return Response.json({ok:false,error:"Missing host"}, {status:400});
  const webhookUrl = "https://" + host + "/telegram-webhook";
  try {
    const tg = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({url:webhookUrl,secret_token:secret,allowed_updates:["message","callback_query"]})
    });
    const data = await tg.json();
    if (!data.ok) return Response.json({ok:false,error:data.description || "Telegram rejected webhook"}, {status:502});
    return Response.json({ok:true,webhook:webhookUrl,telegram:data.description});
  } catch {
    return Response.json({ok:false,error:"Could not reach Telegram API"}, {status:502});
  }
}
