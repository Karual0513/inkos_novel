export interface FeishuConfig {
    readonly webhookUrl: string;
}
export declare function sendFeishu(config: FeishuConfig, title: string, content: string): Promise<void>;
//# sourceMappingURL=feishu.d.ts.map