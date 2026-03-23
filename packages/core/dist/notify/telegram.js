export async function sendTelegram(config, message) {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: config.chatId,
            text: message,
            parse_mode: "Markdown",
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Telegram send failed: ${response.status} ${body}`);
    }
}
//# sourceMappingURL=telegram.js.map