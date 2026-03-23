import { z } from "zod";
export declare const ChapterStatusSchema: z.ZodEnum<["card-generated", "drafting", "drafted", "auditing", "audit-passed", "audit-failed", "revising", "ready-for-review", "approved", "rejected", "published", "imported"]>;
export type ChapterStatus = z.infer<typeof ChapterStatusSchema>;
export declare const ChapterMetaSchema: z.ZodObject<{
    number: z.ZodNumber;
    title: z.ZodString;
    status: z.ZodEnum<["card-generated", "drafting", "drafted", "auditing", "audit-passed", "audit-failed", "revising", "ready-for-review", "approved", "rejected", "published", "imported"]>;
    wordCount: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    auditIssues: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    reviewNote: z.ZodOptional<z.ZodString>;
    detectionScore: z.ZodOptional<z.ZodNumber>;
    detectionProvider: z.ZodOptional<z.ZodString>;
    detectedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    number: number;
    status: "card-generated" | "drafting" | "drafted" | "auditing" | "audit-passed" | "audit-failed" | "revising" | "ready-for-review" | "approved" | "rejected" | "published" | "imported";
    title: string;
    createdAt: string;
    updatedAt: string;
    wordCount: number;
    auditIssues: string[];
    reviewNote?: string | undefined;
    detectionScore?: number | undefined;
    detectionProvider?: string | undefined;
    detectedAt?: string | undefined;
}, {
    number: number;
    status: "card-generated" | "drafting" | "drafted" | "auditing" | "audit-passed" | "audit-failed" | "revising" | "ready-for-review" | "approved" | "rejected" | "published" | "imported";
    title: string;
    createdAt: string;
    updatedAt: string;
    wordCount?: number | undefined;
    auditIssues?: string[] | undefined;
    reviewNote?: string | undefined;
    detectionScore?: number | undefined;
    detectionProvider?: string | undefined;
    detectedAt?: string | undefined;
}>;
export type ChapterMeta = z.infer<typeof ChapterMetaSchema>;
//# sourceMappingURL=chapter.d.ts.map