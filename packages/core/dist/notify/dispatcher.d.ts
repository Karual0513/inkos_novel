import type { NotifyChannel } from "../models/project.js";
import { type WebhookPayload } from "./webhook.js";
export interface NotifyMessage {
    readonly title: string;
    readonly body: string;
}
export declare function dispatchNotification(channels: ReadonlyArray<NotifyChannel>, message: NotifyMessage): Promise<void>;
/** Dispatch a structured webhook event to all webhook channels. */
export declare function dispatchWebhookEvent(channels: ReadonlyArray<NotifyChannel>, payload: WebhookPayload): Promise<void>;
//# sourceMappingURL=dispatcher.d.ts.map