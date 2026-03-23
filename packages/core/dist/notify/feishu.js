export async function sendFeishu(config, title, content) {
    const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            msg_type: "interactive",
            card: {
                header: {
                    title: { tag: "plain_text", content: title },
                    template: "blue",
                },
                elements: [
                    {
                        tag: "markdown",
                        content,
                    },
                ],
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Feishu send failed: ${response.status} ${body}`);
    }
}
//# sourceMappingURL=feishu.js.map