const API = "https://api.telegram.org";

async function telegram(method, token, body) {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return data.result;
}

function reply(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getUserName(message) {
  const origin = message.forward_origin;
  if (origin?.type === "user") {
    const u = origin.sender_user;
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || "Hidden User";
  }
  const text = message.caption || message.text || "";
  const match = text.match(/(?:user|name)\s*[:：-]\s*([^\n]+)/i);
  return match?.[1]?.trim() || "Hidden User";
}

function getAmount(message) {
  const text = message.caption || message.text || "";
  const match = text.match(/(?:₹|rs\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i);
  return match ? `₹${match[1]}` : "Not provided";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { ok: false, error: "POST required" });

  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const secret = process.env.WEBHOOK_SECRET;
  if (!token || !channelId || !secret) return reply(res, 500, { ok: false, error: "Bot environment variables are missing" });
  if (req.headers["x-telegram-bot-api-secret-token"] !== secret) return reply(res, 401, { ok: false, error: "Unauthorized" });

  try {
    const update = req.body || {};
    if (update.callback_query) {
      const q = update.callback_query;
      if (q.data === "privacy_hidden") {
        await telegram("answerCallbackQuery", token, {
          callback_query_id: q.id,
          text: "Account has been hidden",
          show_alert: true
        });
      }
      return reply(res, 200, { ok: true });
    }

    const message = update.message;
    if (!message) return reply(res, 200, { ok: true });

    if (message.chat?.type === "private" && message.text?.startsWith("/start")) {
      await telegram("sendMessage", token, {
        chat_id: message.chat.id,
        text: "Welcome to NEXAPAY WDRL. Forward a withdrawal screenshot here. The bot will post it to the configured channel for admin review."
      });
      return reply(res, 200, { ok: true });
    }

    const photo = message.photo?.at(-1);
    if (message.chat?.type !== "private" || !photo) {
      if (message.chat?.type === "private") {
        await telegram("sendMessage", token, {
          chat_id: message.chat.id,
          text: "Please forward a message containing a withdrawal screenshot."
        });
      }
      return reply(res, 200, { ok: true });
    }

    const userName = getUserName(message);
    const amount = getAmount(message);
    const caption = [
      "💸 WITHDRAWAL VERIFICATION",
      "📸 Proof Submitted",
      "━━━━━━━━━━━━━━━━",
      `💰 Amount: ${amount}`,
      `👤 User: ${userName}`,
      "🕒 Status: Pending Verification",
      "━━━━━━━━━━━━━━━━",
      "🔎 Please review the submitted proof and verify the withdrawal.",
      "",
      "🤖 NEXAPAY WDRL Automated Posting System"
    ].join("\n");

    await telegram("sendPhoto", token, {
      chat_id: channelId,
      photo: photo.file_id,
      caption,
      reply_markup: {
        inline_keyboard: [[
          { text: userName, callback_data: "privacy_hidden" }
        ]]
      }
    });

    await telegram("sendMessage", token, {
      chat_id: message.chat.id,
      text: "✅ Screenshot posted to the channel for admin review."
    });
    return reply(res, 200, { ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return reply(res, 500, { ok: false });
  }
}
