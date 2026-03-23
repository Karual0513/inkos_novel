import { type ToolDefinition } from "../llm/provider.js";
import { type PipelineConfig } from "./runner.js";
/** Tool definitions for the agent loop. */
declare const TOOLS: ReadonlyArray<ToolDefinition>;
export interface AgentLoopOptions {
    readonly onToolCall?: (name: string, args: Record<string, unknown>) => void;
    readonly onToolResult?: (name: string, result: string) => void;
    readonly onMessage?: (content: string) => void;
    readonly maxTurns?: number;
}
export declare function runAgentLoop(config: PipelineConfig, instruction: string, options?: AgentLoopOptions): Promise<string>;
/** Export tool definitions so external systems can reference them. */
export { TOOLS as AGENT_TOOLS };
//# sourceMappingURL=agent.d.ts.map