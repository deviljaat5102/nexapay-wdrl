export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST required" });

  const token = process.env.BOT_TOKEN;
  const secret = process.env.WEBHOOK_SECRET;
  if (!token || !secret) return res.status(500).json({ ok: false, error: "BOT_TOKEN or WEBHOOK_SECRET is missing" });
  if (req.headers["x-setup-secret"] !== secret) return res.status(401).json({ ok: false, error: "Invalid setup secret" });

  const host = req.headers.host;
  if (!host) return res.status(400).json({ ok: false, error: "Missing host" });
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
  if (!result.ok) return res.status(502).json({ ok: false, error: result.description || "Telegram rejected webhook setup" });
  return res.status(200).json({ ok: true, webhook: webhookUrl, telegram: result.description });
}
