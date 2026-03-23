import { z } from "zod";
export declare const BookRulesSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    protagonist: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        personalityLock: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        behavioralConstraints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        personalityLock: string[];
        behavioralConstraints: string[];
    }, {
        name: string;
        personalityLock?: string[] | undefined;
        behavioralConstraints?: string[] | undefined;
    }>>;
    genreLock: z.ZodOptional<z.ZodObject<{
        primary: z.ZodString;
        forbidden: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        primary: string;
        forbidden: string[];
    }, {
        primary: string;
        forbidden?: string[] | undefined;
    }>>;
    numericalSystemOverrides: z.ZodOptional<z.ZodObject<{
        hardCap: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        resourceTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        resourceTypes: string[];
        hardCap?: string | number | undefined;
    }, {
        hardCap?: string | number | undefined;
        resourceTypes?: string[] | undefined;
    }>>;
    eraConstraints: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        period: z.ZodOptional<z.ZodString>;
        region: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        period?: string | undefined;
        region?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        period?: string | undefined;
        region?: string | undefined;
    }>>;
    prohibitions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    chapterTypesOverride: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    fatigueWordsOverride: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    additionalAuditDimensions: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodNumber, z.ZodString]>, "many">>;
    enableFullCastTracking: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    version: string;
    prohibitions: string[];
    chapterTypesOverride: string[];
    fatigueWordsOverride: string[];
    additionalAuditDimensions: (string | number)[];
    enableFullCastTracking: boolean;
    protagonist?: {
        name: string;
        personalityLock: string[];
        behavioralConstraints: string[];
    } | undefined;
    genreLock?: {
        primary: string;
        forbidden: string[];
    } | undefined;
    numericalSystemOverrides?: {
        resourceTypes: string[];
        hardCap?: string | number | undefined;
    } | undefined;
    eraConstraints?: {
        enabled: boolean;
        period?: string | undefined;
        region?: string | undefined;
    } | undefined;
}, {
    version?: string | undefined;
    protagonist?: {
        name: string;
        personalityLock?: string[] | undefined;
        behavioralConstraints?: string[] | undefined;
    } | undefined;
    genreLock?: {
        primary: string;
        forbidden?: string[] | undefined;
    } | undefined;
    numericalSystemOverrides?: {
        hardCap?: string | number | undefined;
        resourceTypes?: string[] | undefined;
    } | undefined;
    eraConstraints?: {
        enabled?: boolean | undefined;
        period?: string | undefined;
        region?: string | undefined;
    } | undefined;
    prohibitions?: string[] | undefined;
    chapterTypesOverride?: string[] | undefined;
    fatigueWordsOverride?: string[] | undefined;
    additionalAuditDimensions?: (string | number)[] | undefined;
    enableFullCastTracking?: boolean | undefined;
}>;
export type BookRules = z.infer<typeof BookRulesSchema>;
export interface ParsedBookRules {
    readonly rules: BookRules;
    readonly body: string;
}
export declare function parseBookRules(raw: string): ParsedBookRules;
//# sourceMappingURL=book-rules.d.ts.map