import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
// === Factory ===
export function createLLMClient(config) {
    const defaults = {
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 8192,
        thinkingBudget: config.thinkingBudget ?? 0,
    };
    const apiFormat = config.apiFormat ?? "chat";
    if (config.provider === "anthropic") {
        // Anthropic SDK appends /v1/ internally — strip if user included it
        const baseURL = config.baseUrl.replace(/\/v1\/?$/, "");
        return {
            provider: "anthropic",
            apiFormat,
            _anthropic: new Anthropic({ apiKey: config.apiKey, baseURL }),
            defaults,
        };
    }
    // openai or custom — both use OpenAI SDK
    return {
        provider: "openai",
        apiFormat,
        _openai: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl }),
        defaults,
    };
}
// === Error Wrapping ===
function wrapLLMError(error) {
    const msg = String(error);
    if (msg.includes("403")) {
        return new Error(`API 返回 403 (请求被拒绝)。可能原因：\n` +
            `  1. API Key 无效或过期\n` +
            `  2. API 提供方的内容审查拦截了请求（公益/免费 API 常见）\n` +
            `  3. 账户余额不足\n` +
            `  建议：用 inkos doctor 测试 API 连通性，或换一个不限制内容的 API 提供方`);
    }
    if (msg.includes("401")) {
        return new Error(`API 返回 401 (未授权)。请检查 .env 中的 INKOS_LLM_API_KEY 是否正确。`);
    }
    if (msg.includes("429")) {
        return new Error(`API 返回 429 (请求过多)。请稍后重试，或检查 API 配额。`);
    }
    return error instanceof Error ? error : new Error(msg);
}
// === Simple Chat (used by all agents via BaseAgent.chat()) ===
export async function chatCompletion(client, model, messages, options) {
    try {
        const resolved = {
            temperature: options?.temperature ?? client.defaults.temperature,
            maxTokens: options?.maxTokens ?? client.defaults.maxTokens,
        };
        if (client.provider === "anthropic") {
            return await chatCompletionAnthropic(client._anthropic, model, messages, resolved, client.defaults.thinkingBudget);
        }
        if (client.apiFormat === "responses") {
            return await chatCompletionOpenAIResponses(client._openai, model, messages, resolved, options?.webSearch);
        }
        return await chatCompletionOpenAIChat(client._openai, model, messages, resolved, options?.webSearch);
    }
    catch (error) {
        throw wrapLLMError(error);
    }
}
// === Tool-calling Chat (used by agent loop) ===
export async function chatWithTools(client, model, messages, tools, options) {
    try {
        const resolved = {
            temperature: options?.temperature ?? client.defaults.temperature,
            maxTokens: options?.maxTokens ?? client.defaults.maxTokens,
        };
        if (client.provider === "anthropic") {
            return await chatWithToolsAnthropic(client._anthropic, model, messages, tools, resolved, client.defaults.thinkingBudget);
        }
        if (client.apiFormat === "responses") {
            return await chatWithToolsOpenAIResponses(client._openai, model, messages, tools, resolved);
        }
        return await chatWithToolsOpenAIChat(client._openai, model, messages, tools, resolved);
    }
    catch (error) {
        throw wrapLLMError(error);
    }
}
// === OpenAI Chat Completions API Implementation (default) ===
async function chatCompletionOpenAIChat(client, model, messages, options, webSearch) {
    const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
        ...(webSearch ? { web_search_options: { search_context_size: "medium" } } : {}),
    });
    const chunks = [];
    let inputTokens = 0;
    let outputTokens = 0;
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta)
            chunks.push(delta);
        if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0;
            outputTokens = chunk.usage.completion_tokens ?? 0;
        }
    }
    const content = chunks.join("");
    if (!content)
        throw new Error("LLM returned empty response");
    return {
        content,
        usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
        },
    };
}
async function chatWithToolsOpenAIChat(client, model, messages, tools, options) {
    const openaiMessages = agentMessagesToOpenAIChat(messages);
    const openaiTools = tools.map((t) => ({
        type: "function",
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
    const stream = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        tools: openaiTools,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true,
    });
    let content = "";
    const toolCallMap = new Map();
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content)
            content += delta.content;
        if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
                const existing = toolCallMap.get(tc.index);
                if (existing) {
                    existing.arguments += tc.function?.arguments ?? "";
                }
                else {
                    toolCallMap.set(tc.index, {
                        id: tc.id ?? "",
                        name: tc.function?.name ?? "",
                        arguments: tc.function?.arguments ?? "",
                    });
                }
            }
        }
    }
    const toolCalls = [...toolCallMap.values()];
    return { content, toolCalls };
}
function agentMessagesToOpenAIChat(messages) {
    const result = [];
    for (const msg of messages) {
        if (msg.role === "system") {
            result.push({ role: "system", content: msg.content });
            continue;
        }
        if (msg.role === "user") {
            result.push({ role: "user", content: msg.content });
            continue;
        }
        if (msg.role === "assistant") {
            const assistantMsg = {
                role: "assistant",
                content: msg.content ?? null,
            };
            if (msg.toolCalls && msg.toolCalls.length > 0) {
                assistantMsg.tool_calls = msg.toolCalls.map((tc) => ({
                    id: tc.id,
                    type: "function",
                    function: { name: tc.name, arguments: tc.arguments },
                }));
            }
            result.push(assistantMsg);
            continue;
        }
        if (msg.role === "tool") {
            result.push({
                role: "tool",
                tool_call_id: msg.toolCallId,
                content: msg.content,
            });
        }
    }
    return result;
}
// === OpenAI Responses API Implementation (optional) ===
async function chatCompletionOpenAIResponses(client, model, messages, options, webSearch) {
    const input = messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));
    const tools = webSearch
        ? [{ type: "web_search_preview" }]
        : undefined;
    const stream = await client.responses.create({
        model,
        input,
        temperature: options.temperature,
        max_output_tokens: options.maxTokens,
        stream: true,
        ...(tools ? { tools } : {}),
    });
    const chunks = [];
    let inputTokens = 0;
    let outputTokens = 0;
    for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
            chunks.push(event.delta);
        }
        if (event.type === "response.completed") {
            inputTokens = event.response.usage?.input_tokens ?? 0;
            outputTokens = event.response.usage?.output_tokens ?? 0;
        }
    }
    const content = chunks.join("");
    if (!content)
        throw new Error("LLM returned empty response");
    return {
        content,
        usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
        },
    };
}
async function chatWithToolsOpenAIResponses(client, model, messages, tools, options) {
    const input = agentMessagesToResponsesInput(messages);
    const responsesTools = tools.map((t) => ({
        type: "function",
        name: t.name,
        description: t.description,
        parameters: t.parameters,
        strict: false,
    }));
    const stream = await client.responses.create({
        model,
        input,
        tools: responsesTools,
        temperature: options.temperature,
        max_output_tokens: options.maxTokens,
        stream: true,
    });
    let content = "";
    const toolCalls = [];
    for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
            content += event.delta;
        }
        if (event.type === "response.output_item.done" && event.item.type === "function_call") {
            toolCalls.push({
                id: event.item.call_id,
                name: event.item.name,
                arguments: event.item.arguments,
            });
        }
    }
    return { content, toolCalls };
}
function agentMessagesToResponsesInput(messages) {
    const result = [];
    for (const msg of messages) {
        if (msg.role === "system") {
            result.push({ role: "system", content: msg.content });
            continue;
        }
        if (msg.role === "user") {
            result.push({ role: "user", content: msg.content });
            continue;
        }
        if (msg.role === "assistant") {
            if (msg.content) {
                result.push({ role: "assistant", content: msg.content });
            }
            if (msg.toolCalls) {
                for (const tc of msg.toolCalls) {
                    result.push({
                        type: "function_call",
                        call_id: tc.id,
                        name: tc.name,
                        arguments: tc.arguments,
                    });
                }
            }
            continue;
        }
        if (msg.role === "tool") {
            result.push({
                type: "function_call_output",
                call_id: msg.toolCallId,
                output: msg.content,
            });
        }
    }
    return result;
}
// === Anthropic Implementation ===
async function chatCompletionAnthropic(client, model, messages, options, thinkingBudget = 0) {
    const systemText = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");
    const nonSystem = messages.filter((m) => m.role !== "system");
    const stream = await client.messages.create({
        model,
        ...(systemText ? { system: systemText } : {}),
        messages: nonSystem.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        ...(thinkingBudget > 0
            ? { thinking: { type: "enabled", budget_tokens: thinkingBudget } }
            : { temperature: options.temperature }),
        max_tokens: options.maxTokens,
        stream: true,
    });
    const chunks = [];
    let inputTokens = 0;
    let outputTokens = 0;
    for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            chunks.push(event.delta.text);
        }
        if (event.type === "message_start") {
            inputTokens = event.message.usage?.input_tokens ?? 0;
        }
        if (event.type === "message_delta") {
            outputTokens = (event.usage?.output_tokens) ?? 0;
        }
    }
    const content = chunks.join("");
    if (!content)
        throw new Error("LLM returned empty response");
    return {
        content,
        usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
        },
    };
}
async function chatWithToolsAnthropic(client, model, messages, tools, options, thinkingBudget = 0) {
    const systemText = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");
    const nonSystem = messages.filter((m) => m.role !== "system");
    const anthropicMessages = agentMessagesToAnthropic(nonSystem);
    const anthropicTools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
    }));
    const stream = await client.messages.create({
        model,
        ...(systemText ? { system: systemText } : {}),
        messages: anthropicMessages,
        tools: anthropicTools,
        ...(thinkingBudget > 0
            ? { thinking: { type: "enabled", budget_tokens: thinkingBudget } }
            : { temperature: options.temperature }),
        max_tokens: options.maxTokens,
        stream: true,
    });
    let content = "";
    const toolCalls = [];
    let currentBlock = null;
    for await (const event of stream) {
        if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            currentBlock = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: "",
            };
        }
        if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
                content += event.delta.text;
            }
            if (event.delta.type === "input_json_delta" && currentBlock) {
                currentBlock.input += event.delta.partial_json;
            }
        }
        if (event.type === "content_block_stop" && currentBlock) {
            toolCalls.push({
                id: currentBlock.id,
                name: currentBlock.name,
                arguments: currentBlock.input,
            });
            currentBlock = null;
        }
    }
    return { content, toolCalls };
}
function agentMessagesToAnthropic(messages) {
    const result = [];
    for (const msg of messages) {
        if (msg.role === "system")
            continue;
        if (msg.role === "user") {
            result.push({ role: "user", content: msg.content });
            continue;
        }
        if (msg.role === "assistant") {
            const blocks = [];
            if (msg.content) {
                blocks.push({ type: "text", text: msg.content });
            }
            if (msg.toolCalls) {
                for (const tc of msg.toolCalls) {
                    blocks.push({
                        type: "tool_use",
                        id: tc.id,
                        name: tc.name,
                        input: JSON.parse(tc.arguments),
                    });
                }
            }
            if (blocks.length === 0) {
                blocks.push({ type: "text", text: "" });
            }
            result.push({ role: "assistant", content: blocks });
            continue;
        }
        if (msg.role === "tool") {
            const toolResult = {
                type: "tool_result",
                tool_use_id: msg.toolCallId,
                content: msg.content,
            };
            // Merge consecutive tool results into one user message (Anthropic requires alternating roles)
            const prev = result[result.length - 1];
            if (prev && prev.role === "user" && Array.isArray(prev.content)) {
                prev.content.push(toolResult);
            }
            else {
                result.push({ role: "user", content: [toolResult] });
            }
        }
    }
    return result;
}
//# sourceMappingURL=provider.js.map