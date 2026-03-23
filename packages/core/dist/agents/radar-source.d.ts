export interface RankingEntry {
    readonly title: string;
    readonly author: string;
    readonly category: string;
    readonly extra: string;
}
export interface PlatformRankings {
    readonly platform: string;
    readonly entries: ReadonlyArray<RankingEntry>;
}
/**
 * Pluggable data source for the Radar agent.
 * Implement this interface to feed custom ranking/trend data
 * (e.g. from OpenClaw, custom scrapers, paid APIs).
 */
export interface RadarSource {
    readonly name: string;
    fetch(): Promise<PlatformRankings>;
}
/**
 * Wraps raw natural language text as a radar source.
 * Use this to inject external analysis (e.g. from OpenClaw) into the radar pipeline.
 */
export declare class TextRadarSource implements RadarSource {
    readonly name: string;
    private readonly text;
    constructor(text: string, name?: string);
    fetch(): Promise<PlatformRankings>;
}
export declare class FanqieRadarSource implements RadarSource {
    readonly name = "fanqie";
    fetch(): Promise<PlatformRankings>;
}
export declare class QidianRadarSource implements RadarSource {
    readonly name = "qidian";
    fetch(): Promise<PlatformRankings>;
}
//# sourceMappingURL=radar-source.d.ts.map