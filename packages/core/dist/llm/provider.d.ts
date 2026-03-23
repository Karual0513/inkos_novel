import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { LLMConfig } from "../models/project.js";
export interface LLMResponse {
    readonly content: string;
    readonly usage: {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
    };
}
export interface LLMMessage {
    readonly role: "system" | "user" | "assistant";
    readonly content: string;
}
export interface LLMClient {
    readonly provider: "openai" | "anthropic";
    readonly apiFormat: "chat" | "responses";
    readonly _openai?: OpenAI;
    readonly _anthropic?: Anthropic;
    readonly defaults: {
        readonly temperature: number;
        readonly maxTokens: number;
        readonly thinkingBudget: number;
    };
}
export interface ToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
}
export interface ToolCall {
    readonly id: string;
    readonly name: string;
    readonly arguments: string;
}
export type AgentMessage = {
    readonly role: "system";
    readonly content: string;
} | {
    readonly role: "user";
    readonly content: string;
} | {
    readonly role: "assistant";
    readonly content: string | null;
    readonly toolCalls?: ReadonlyArray<ToolCall>;
} | {
    readonly role: "tool";
    readonly toolCallId: string;
    readonly content: string;
};
export interface ChatWithToolsResult {
    readonly content: string;
    readonly toolCalls: ReadonlyArray<ToolCall>;
}
export declare function createLLMClient(config: LLMConfig): LLMClient;
export declare function chatCompletion(client: LLMClient, model: string, messages: ReadonlyArray<LLMMessage>, options?: {
    readonly temperature?: number;
    readonly maxTokens?: number;
    readonly webSearch?: boolean;
}): Promise<LLMResponse>;
export declare function chatWithTools(client: LLMClient, model: string, messages: ReadonlyArray<AgentMessage>, tools: ReadonlyArray<ToolDefinition>, options?: {
    readonly temperature?: number;
    readonly maxTokens?: number;
}): Promise<ChatWithToolsResult>;
//# sourceMappingURL=provider.d.ts.map