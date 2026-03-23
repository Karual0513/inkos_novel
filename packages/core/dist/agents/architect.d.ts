import { BaseAgent } from "./base.js";
import type { BookConfig } from "../models/book.js";
export interface ArchitectOutput {
    readonly storyBible: string;
    readonly volumeOutline: string;
    readonly bookRules: string;
    readonly currentState: string;
    readonly pendingHooks: string;
}
export declare class ArchitectAgent extends BaseAgent {
    get name(): string;
    generateFoundation(book: BookConfig, externalContext?: string): Promise<ArchitectOutput>;
    writeFoundationFiles(bookDir: string, output: ArchitectOutput, numericalSystem?: boolean): Promise<void>;
    /**
     * Reverse-engineer foundation from existing chapters.
     * Reads all chapters as a single text block and asks LLM to extract story_bible,
     * volume_outline, book_rules, current_state, and pending_hooks.
     */
    generateFoundationFromImport(book: BookConfig, chaptersText: string, externalContext?: string): Promise<ArchitectOutput>;
    private parseSections;
}
//# sourceMappingURL=architect.d.ts.map