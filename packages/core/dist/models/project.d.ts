import { z } from "zod";
export declare const LLMConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<["anthropic", "openai", "custom"]>;
    baseUrl: z.ZodString;
    apiKey: z.ZodDefault<z.ZodString>;
    model: z.ZodString;
    temperature: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    thinkingBudget: z.ZodDefault<z.ZodNumber>;
    apiFormat: z.ZodDefault<z.ZodEnum<["chat", "responses"]>>;
}, "strip", z.ZodTypeAny, {
    provider: "custom" | "anthropic" | "openai";
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    thinkingBudget: number;
    apiFormat: "chat" | "responses";
}, {
    provider: "custom" | "anthropic" | "openai";
    baseUrl: string;
    model: string;
    apiKey?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    thinkingBudget?: number | undefined;
    apiFormat?: "chat" | "responses" | undefined;
}>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export declare const NotifyChannelSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"telegram">;
    botToken: z.ZodString;
    chatId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "telegram";
    botToken: string;
    chatId: string;
}, {
    type: "telegram";
    botToken: string;
    chatId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"wechat-work">;
    webhookUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "wechat-work";
    webhookUrl: string;
}, {
    type: "wechat-work";
    webhookUrl: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"feishu">;
    webhookUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "feishu";
    webhookUrl: string;
}, {
    type: "feishu";
    webhookUrl: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"webhook">;
    url: z.ZodString;
    secret: z.ZodOptional<z.ZodString>;
    events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "webhook";
    url: string;
    events: string[];
    secret?: string | undefined;
}, {
    type: "webhook";
    url: string;
    secret?: string | undefined;
    events?: string[] | undefined;
}>]>;
export type NotifyChannel = z.infer<typeof NotifyChannelSchema>;
export declare const DetectionConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["gptzero", "originality", "custom"]>>;
    apiUrl: z.ZodString;
    apiKeyEnv: z.ZodString;
    threshold: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    autoRewrite: z.ZodDefault<z.ZodBoolean>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "custom" | "gptzero" | "originality";
    apiUrl: string;
    apiKeyEnv: string;
    threshold: number;
    enabled: boolean;
    autoRewrite: boolean;
    maxRetries: number;
}, {
    apiUrl: string;
    apiKeyEnv: string;
    provider?: "custom" | "gptzero" | "originality" | undefined;
    threshold?: number | undefined;
    enabled?: boolean | undefined;
    autoRewrite?: boolean | undefined;
    maxRetries?: number | undefined;
}>;
export type DetectionConfig = z.infer<typeof DetectionConfigSchema>;
export declare const QualityGatesSchema: z.ZodObject<{
    maxAuditRetries: z.ZodDefault<z.ZodNumber>;
    pauseAfterConsecutiveFailures: z.ZodDefault<z.ZodNumber>;
    retryTemperatureStep: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAuditRetries: number;
    pauseAfterConsecutiveFailures: number;
    retryTemperatureStep: number;
}, {
    maxAuditRetries?: number | undefined;
    pauseAfterConsecutiveFailures?: number | undefined;
    retryTemperatureStep?: number | undefined;
}>;
export type QualityGates = z.infer<typeof QualityGatesSchema>;
export declare const ProjectConfigSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodLiteral<"0.1.0">;
    llm: z.ZodObject<{
        provider: z.ZodEnum<["anthropic", "openai", "custom"]>;
        baseUrl: z.ZodString;
        apiKey: z.ZodDefault<z.ZodString>;
        model: z.ZodString;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        thinkingBudget: z.ZodDefault<z.ZodNumber>;
        apiFormat: z.ZodDefault<z.ZodEnum<["chat", "responses"]>>;
    }, "strip", z.ZodTypeAny, {
        provider: "custom" | "anthropic" | "openai";
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        thinkingBudget: number;
        apiFormat: "chat" | "responses";
    }, {
        provider: "custom" | "anthropic" | "openai";
        baseUrl: string;
        model: string;
        apiKey?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        thinkingBudget?: number | undefined;
        apiFormat?: "chat" | "responses" | undefined;
    }>;
    notify: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"telegram">;
        botToken: z.ZodString;
        chatId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "telegram";
        botToken: string;
        chatId: string;
    }, {
        type: "telegram";
        botToken: string;
        chatId: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"wechat-work">;
        webhookUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "wechat-work";
        webhookUrl: string;
    }, {
        type: "wechat-work";
        webhookUrl: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"feishu">;
        webhookUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "feishu";
        webhookUrl: string;
    }, {
        type: "feishu";
        webhookUrl: string;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"webhook">;
        url: z.ZodString;
        secret: z.ZodOptional<z.ZodString>;
        events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook";
        url: string;
        events: string[];
        secret?: string | undefined;
    }, {
        type: "webhook";
        url: string;
        secret?: string | undefined;
        events?: string[] | undefined;
    }>]>, "many">>;
    detection: z.ZodOptional<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["gptzero", "originality", "custom"]>>;
        apiUrl: z.ZodString;
        apiKeyEnv: z.ZodString;
        threshold: z.ZodDefault<z.ZodNumber>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        autoRewrite: z.ZodDefault<z.ZodBoolean>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "custom" | "gptzero" | "originality";
        apiUrl: string;
        apiKeyEnv: string;
        threshold: number;
        enabled: boolean;
        autoRewrite: boolean;
        maxRetries: number;
    }, {
        apiUrl: string;
        apiKeyEnv: string;
        provider?: "custom" | "gptzero" | "originality" | undefined;
        threshold?: number | undefined;
        enabled?: boolean | undefined;
        autoRewrite?: boolean | undefined;
        maxRetries?: number | undefined;
    }>>;
    modelOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    daemon: z.ZodDefault<z.ZodObject<{
        schedule: z.ZodObject<{
            radarCron: z.ZodDefault<z.ZodString>;
            writeCron: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            radarCron: string;
            writeCron: string;
        }, {
            radarCron?: string | undefined;
            writeCron?: string | undefined;
        }>;
        maxConcurrentBooks: z.ZodDefault<z.ZodNumber>;
        chaptersPerCycle: z.ZodDefault<z.ZodNumber>;
        retryDelayMs: z.ZodDefault<z.ZodNumber>;
        cooldownAfterChapterMs: z.ZodDefault<z.ZodNumber>;
        maxChaptersPerDay: z.ZodDefault<z.ZodNumber>;
        qualityGates: z.ZodDefault<z.ZodObject<{
            maxAuditRetries: z.ZodDefault<z.ZodNumber>;
            pauseAfterConsecutiveFailures: z.ZodDefault<z.ZodNumber>;
            retryTemperatureStep: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxAuditRetries: number;
            pauseAfterConsecutiveFailures: number;
            retryTemperatureStep: number;
        }, {
            maxAuditRetries?: number | undefined;
            pauseAfterConsecutiveFailures?: number | undefined;
            retryTemperatureStep?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        schedule: {
            radarCron: string;
            writeCron: string;
        };
        maxConcurrentBooks: number;
        chaptersPerCycle: number;
        retryDelayMs: number;
        cooldownAfterChapterMs: number;
        maxChaptersPerDay: number;
        qualityGates: {
            maxAuditRetries: number;
            pauseAfterConsecutiveFailures: number;
            retryTemperatureStep: number;
        };
    }, {
        schedule: {
            radarCron?: string | undefined;
            writeCron?: string | undefined;
        };
        maxConcurrentBooks?: number | undefined;
        chaptersPerCycle?: number | undefined;
        retryDelayMs?: number | undefined;
        cooldownAfterChapterMs?: number | undefined;
        maxChaptersPerDay?: number | undefined;
        qualityGates?: {
            maxAuditRetries?: number | undefined;
            pauseAfterConsecutiveFailures?: number | undefined;
            retryTemperatureStep?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: "0.1.0";
    llm: {
        provider: "custom" | "anthropic" | "openai";
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        thinkingBudget: number;
        apiFormat: "chat" | "responses";
    };
    notify: ({
        type: "telegram";
        botToken: string;
        chatId: string;
    } | {
        type: "wechat-work";
        webhookUrl: string;
    } | {
        type: "feishu";
        webhookUrl: string;
    } | {
        type: "webhook";
        url: string;
        events: string[];
        secret?: string | undefined;
    })[];
    daemon: {
        schedule: {
            radarCron: string;
            writeCron: string;
        };
        maxConcurrentBooks: number;
        chaptersPerCycle: number;
        retryDelayMs: number;
        cooldownAfterChapterMs: number;
        maxChaptersPerDay: number;
        qualityGates: {
            maxAuditRetries: number;
            pauseAfterConsecutiveFailures: number;
            retryTemperatureStep: number;
        };
    };
    detection?: {
        provider: "custom" | "gptzero" | "originality";
        apiUrl: string;
        apiKeyEnv: string;
        threshold: number;
        enabled: boolean;
        autoRewrite: boolean;
        maxRetries: number;
    } | undefined;
    modelOverrides?: Record<string, string> | undefined;
}, {
    name: string;
    version: "0.1.0";
    llm: {
        provider: "custom" | "anthropic" | "openai";
        baseUrl: string;
        model: string;
        apiKey?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        thinkingBudget?: number | undefined;
        apiFormat?: "chat" | "responses" | undefined;
    };
    notify?: ({
        type: "telegram";
        botToken: string;
        chatId: string;
    } | {
        type: "wechat-work";
        webhookUrl: string;
    } | {
        type: "feishu";
        webhookUrl: string;
    } | {
        type: "webhook";
        url: string;
        secret?: string | undefined;
        events?: string[] | undefined;
    })[] | undefined;
    detection?: {
        apiUrl: string;
        apiKeyEnv: string;
        provider?: "custom" | "gptzero" | "originality" | undefined;
        threshold?: number | undefined;
        enabled?: boolean | undefined;
        autoRewrite?: boolean | undefined;
        maxRetries?: number | undefined;
    } | undefined;
    modelOverrides?: Record<string, string> | undefined;
    daemon?: {
        schedule: {
            radarCron?: string | undefined;
            writeCron?: string | undefined;
        };
        maxConcurrentBooks?: number | undefined;
        chaptersPerCycle?: number | undefined;
        retryDelayMs?: number | undefined;
        cooldownAfterChapterMs?: number | undefined;
        maxChaptersPerDay?: number | undefined;
        qualityGates?: {
            maxAuditRetries?: number | undefined;
            pauseAfterConsecutiveFailures?: number | undefined;
            retryTemperatureStep?: number | undefined;
        } | undefined;
    } | undefined;
}>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
//# sourceMappingURL=project.d.ts.map