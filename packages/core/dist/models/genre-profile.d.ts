import { z } from "zod";
export declare const GenreProfileSchema: z.ZodObject<{
    name: z.ZodString;
    id: z.ZodString;
    chapterTypes: z.ZodArray<z.ZodString, "many">;
    fatigueWords: z.ZodArray<z.ZodString, "many">;
    numericalSystem: z.ZodDefault<z.ZodBoolean>;
    powerScaling: z.ZodDefault<z.ZodBoolean>;
    eraResearch: z.ZodDefault<z.ZodBoolean>;
    pacingRule: z.ZodDefault<z.ZodString>;
    satisfactionTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    auditDimensions: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    chapterTypes: string[];
    fatigueWords: string[];
    numericalSystem: boolean;
    powerScaling: boolean;
    eraResearch: boolean;
    pacingRule: string;
    satisfactionTypes: string[];
    auditDimensions: number[];
}, {
    id: string;
    name: string;
    chapterTypes: string[];
    fatigueWords: string[];
    numericalSystem?: boolean | undefined;
    powerScaling?: boolean | undefined;
    eraResearch?: boolean | undefined;
    pacingRule?: string | undefined;
    satisfactionTypes?: string[] | undefined;
    auditDimensions?: number[] | undefined;
}>;
export type GenreProfile = z.infer<typeof GenreProfileSchema>;
export interface ParsedGenreProfile {
    readonly profile: GenreProfile;
    readonly body: string;
}
export declare function parseGenreProfile(raw: string): ParsedGenreProfile;
//# sourceMappingURL=genre-profile.d.ts.map