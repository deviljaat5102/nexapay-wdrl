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

function extractUserName(message) {
  const origin = message.forward_origin;
  if (origin?.type === "user") {
    const u = origin.sender_user;
    return [u.first_name, u.last_name].filter(Boolean).join(" ") || "Hidden User";
  }
  const sourceText = message.caption || message.text || "";
  const match = sourceText.match(/(?:user|name)\s*[:：-]\s*([^\n]+)/i);
  return match?.[1]?.trim() || "Hidden User";
}

function extractAmount(message) {
  const sourceText = message.caption || message.text || "";
  const match = sourceText.match(/(?:₹|rs\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i);
  return match ? `₹${match[1]}` : "Not provided";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const secret = process.env.WEBHOOK_SECRET;

  if (!token || !channelId || !secret) {
    return res.status(500).send("Bot environment variables are not configured");
  }
  if (req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const update = req.body || {};

    if (update.callback_query) {
      const query = update.callback_query;
      if (query.data === "privacy_hidden") {
        await telegram("answerCallbackQuery", token, {
          callback_query_id: query.id,
          text: "Account has been hidden",
          show_alert: true
        });
      }
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    if (!message) return res.status(200).json({ ok: true });

    if (message.chat?.type === "private" && message.text?.startsWith("/start")) {
      await telegram("sendMessage", token, {
        chat_id: message.chat.id,
        text: "Welcome to NEXAPAY WDRL. Forward a withdrawal screenshot here. The bot will post it to the configured channel for admin review."
      });
      return res.status(200).json({ ok: true });
    }

    const photo = message.photo?.at(-1);
    if (message.chat?.type !== "private" || !photo) {
      if (message.chat?.type === "private") {
        await telegram("sendMessage", token, {
          chat_id: message.chat.id,
          text: "Please forward a message containing a withdrawal screenshot."
        });
      }
      return res.status(200).json({ ok: true });
    }

    const userName = extractUserName(message);
    const amount = extractAmount(message);
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

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ ok: false });
  }
}
