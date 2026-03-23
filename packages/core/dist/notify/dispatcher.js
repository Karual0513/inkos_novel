import { sendTelegram } from "./telegram.js";
import { sendFeishu } from "./feishu.js";
import { sendWechatWork } from "./wechat-work.js";
import { sendWebhook } from "./webhook.js";
export async function dispatchNotification(channels, message) {
    const fullText = `**${message.title}**\n\n${message.body}`;
    const tasks = channels.map(async (channel) => {
        try {
            switch (channel.type) {
                case "telegram":
                    await sendTelegram({ botToken: channel.botToken, chatId: channel.chatId }, fullText);
                    break;
                case "feishu":
                    await sendFeishu({ webhookUrl: channel.webhookUrl }, message.title, message.body);
                    break;
                case "wechat-work":
                    await sendWechatWork({ webhookUrl: channel.webhookUrl }, fullText);
                    break;
                case "webhook":
                    // Webhook channels are handled by dispatchWebhookEvent for structured events.
                    // For generic text notifications, send as a pipeline-complete event.
                    await sendWebhook({ url: channel.url, secret: channel.secret, events: channel.events }, {
                        event: "pipeline-complete",
                        bookId: "",
                        timestamp: new Date().toISOString(),
                        data: { title: message.title, body: message.body },
                    });
                    break;
            }
        }
        catch (e) {
            // Log but don't throw — notification failure shouldn't block pipeline
            process.stderr.write(`[notify] ${channel.type} failed: ${e}\n`);
        }
    });
    await Promise.all(tasks);
}
/** Dispatch a structured webhook event to all webhook channels. */
export async function dispatchWebhookEvent(channels, payload) {
    const webhookChannels = channels.filter((ch) => ch.type === "webhook");
    if (webhookChannels.length === 0)
        return;
    const tasks = webhookChannels.map(async (channel) => {
        if (channel.type !== "webhook")
            return;
        try {
            await sendWebhook({ url: channel.url, secret: channel.secret, events: channel.events }, payload);
        }
        catch (e) {
            process.stderr.write(`[webhook] ${channel.url} failed: ${e}\n`);
        }
    });
    await Promise.all(tasks);
}
//# sourceMappingURL=dispatcher.js.map