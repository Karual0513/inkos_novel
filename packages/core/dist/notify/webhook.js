import { createHmac } from "node:crypto";
export async function sendWebhook(config, payload) {
    // Filter by subscribed events
    if (config.events && config.events.length > 0 && !config.events.includes(payload.event)) {
        return;
    }
    const body = JSON.stringify(payload);
    const headers = {
        "Content-Type": "application/json",
    };
    // HMAC-SHA256 signature if secret is configured
    if (config.secret) {
        const signature = createHmac("sha256", config.secret)
            .update(body)
            .digest("hex");
        headers["X-InkOS-Signature"] = `sha256=${signature}`;
    }
    const response = await fetch(config.url, {
        method: "POST",
        headers,
        body,
    });
    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Webhook POST to ${config.url} failed: ${response.status} ${responseBody}`);
    }
}
//# sourceMappingURL=webhook.js.map