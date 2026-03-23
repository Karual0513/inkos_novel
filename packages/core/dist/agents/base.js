import { chatCompletion } from "../llm/provider.js";
export class BaseAgent {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    async chat(messages, options) {
        return chatCompletion(this.ctx.client, this.ctx.model, messages, options);
    }
    /**
     * Chat with provider-native web search enabled.
     * OpenAI Chat API: uses web_search_options.
     * OpenAI Responses API: uses web_search_preview hosted tool.
     * Anthropic: falls back to regular chat (no native search).
     */
    async chatWithSearch(messages, options) {
        return chatCompletion(this.ctx.client, this.ctx.model, messages, {
            ...options,
            webSearch: true,
        });
    }
}
//# sourceMappingURL=base.js.map