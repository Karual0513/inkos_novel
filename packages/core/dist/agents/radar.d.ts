import { BaseAgent } from "./base.js";
import type { Platform, Genre } from "../models/book.js";
import type { RadarSource } from "./radar-source.js";
export interface RadarResult {
    readonly recommendations: ReadonlyArray<RadarRecommendation>;
    readonly marketSummary: string;
    readonly timestamp: string;
}
export interface RadarRecommendation {
    readonly platform: Platform;
    readonly genre: Genre;
    readonly concept: string;
    readonly confidence: number;
    readonly reasoning: string;
    readonly benchmarkTitles: ReadonlyArray<string>;
}
export declare class RadarAgent extends BaseAgent {
    private readonly sources;
    constructor(ctx: ConstructorParameters<typeof BaseAgent>[0], sources?: ReadonlyArray<RadarSource>);
    get name(): string;
    scan(): Promise<RadarResult>;
    private parseResult;
}
//# sourceMappingURL=radar.d.ts.map