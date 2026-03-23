export interface WebhookConfig {
    readonly url: string;
    readonly secret?: string;
    readonly events?: ReadonlyArray<string>;
}
export type WebhookEvent = "chapter-complete" | "audit-passed" | "audit-failed" | "revision-complete" | "pipeline-complete" | "pipeline-error" | "diagnostic-alert";
export interface WebhookPayload {
    readonly event: WebhookEvent;
    readonly bookId: string;
    readonly chapterNumber?: number;
    readonly timestamp: string;
    readonly data?: Record<string, unknown>;
}
export declare function sendWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<void>;
//# sourceMappingURL=webhook.d.ts.map