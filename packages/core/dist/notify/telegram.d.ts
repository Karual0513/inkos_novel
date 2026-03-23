export interface TelegramConfig {
    readonly botToken: string;
    readonly chatId: string;
}
export declare function sendTelegram(config: TelegramConfig, message: string): Promise<void>;
//# sourceMappingURL=telegram.d.ts.map