export async function sendWechatWork(config, content) {
    const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            msgtype: "markdown",
            markdown: { content },
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`WeCom send failed: ${response.status} ${body}`);
    }
}
//# sourceMappingURL=wechat-work.js.map