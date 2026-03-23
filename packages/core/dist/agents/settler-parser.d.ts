import type { GenreProfile } from "../models/genre-profile.js";
export interface SettlementOutput {
    readonly postSettlement: string;
    readonly updatedState: string;
    readonly updatedLedger: string;
    readonly updatedHooks: string;
    readonly chapterSummary: string;
    readonly updatedSubplots: string;
    readonly updatedEmotionalArcs: string;
    readonly updatedCharacterMatrix: string;
}
export declare function parseSettlementOutput(content: string, genreProfile: GenreProfile): SettlementOutput;
//# sourceMappingURL=settler-parser.d.ts.map