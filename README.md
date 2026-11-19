# NEXAPAY WDRL

Telegram bot that forwards user-submitted withdrawal screenshots to a configured channel with a clearly marked **Pending Verification** caption.

## Vercel environment variables

- `BOT_TOKEN`: Telegram bot token (keep secret)
- `CHANNEL_ID`: destination channel ID, e.g. `-1001234567890`
- `WEBHOOK_SECRET`: random secret string (1–256 characters, use letters, numbers, underscore, hyphen)

## Setup

1. Import this repository into Vercel.
2. Add the three environment variables above.
3. Deploy.
4. Add the bot to the destination channel as an administrator with permission to post messages.
5. Set the webhook once using Telegram's setWebhook API, with URL:
   `https://YOUR-VERCEL-DOMAIN/telegram-webhook`
   and the same `WEBHOOK_SECRET` as `secret_token`.

Only forward screenshots you are authorized to share. The bot does not verify payments or alter evidence; admins must review the original screenshot and confirm status independently. If Telegram hides the original sender, the post labels the user as "Hidden User" unless a name is included in the forwarded caption.
