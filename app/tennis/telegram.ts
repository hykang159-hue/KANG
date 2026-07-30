type SendTelegramResult = {
  ok: boolean;
  description?: string;
};

export async function sendTelegramMessage(
  text: string,
): Promise<SendTelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID가 필요합니다.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  const payload = (await response.json()) as {
    ok: boolean;
    description?: string;
  };

  if (!response.ok || !payload.ok) {
    return {
      ok: false,
      description: payload.description ?? `HTTP ${response.status}`,
    };
  }

  return { ok: true };
}
