import type { LLMClient, LLMMessage, LLMResponse } from "../llm/provider.js";
export interface AgentContext {
    readonly client: LLMClient;
    readonly model: string;
    readonly projectRoot: string;
    readonly bookId?: string;
}
export declare abstract class BaseAgent {
    protected readonly ctx: AgentContext;
    constructor(ctx: AgentContext);
    protected chat(messages: ReadonlyArray<LLMMessage>, options?: {
        readonly temperature?: number;
        readonly maxTokens?: number;
    }): Promise<LLMResponse>;
    /**
     * Chat with provider-native web search enabled.
     * OpenAI Chat API: uses web_search_options.
     * OpenAI Responses API: uses web_search_preview hosted tool.
     * Anthropic: falls back to regular chat (no native search).
     */
    protected chatWithSearch(messages: ReadonlyArray<LLMMessage>, options?: {
        readonly temperature?: number;
        readonly maxTokens?: number;
    }): Promise<LLMResponse>;
    abstract get name(): string;
}
//# sourceMappingURL=base.d.ts.map