const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export const sendApprovalRequest = async (
  postId: string,
  title: string,
  slug: string,
): Promise<void> => {
  const message = `
🆕 New post pending approval:

📝 Title: ${title}
🔗 Slug: ${slug}

Please review and approve or reject.
  `.trim();

   const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `approve_${postId}` },
            { text: "❌ Reject", callback_data: `reject_${postId}` },
          ],
        ],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram error ${response.status}: ${await response.text()}`,
    );
  }
};
