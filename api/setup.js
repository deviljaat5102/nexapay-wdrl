export default async function handler(req) {
  if (req.method !== "POST") return Response.json({ ok: false, error: "POST required" }, { status: 405 });

  const token = process.env.BOT_TOKEN;
  const secret = process.env.WEBHOOK_SECRET;
  if (!token || !secret) return Response.json({ ok: false, error: "BOT_TOKEN or WEBHOOK_SECRET is missing" }, { status: 500 });
  if (req.headers.get("x-setup-secret") !== secret) return Response.json({ ok: false, error: "Secret did not match Vercel WEBHOOK_SECRET" }, { status: 401 });

  const host = req.headers.get("host");
  if (!host) return Response.json({ ok: false, error: "Missing host" }, { status: 400 });
  const webhookUrl = `https://${host}/telegram-webhook`;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"]
    })
  });
  const result = await response.json();
  if (!result.ok) return Response.json({ ok: false, error: result.description || "Telegram rejected webhook setup" }, { status: 502 });
  return Response.json({ ok: true, webhook: webhookUrl, telegram: result.description });
}
