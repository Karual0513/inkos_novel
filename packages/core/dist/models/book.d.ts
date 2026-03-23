import { z } from "zod";
export declare const PlatformSchema: z.ZodEnum<["tomato", "feilu", "qidian", "other"]>;
export type Platform = z.infer<typeof PlatformSchema>;
export declare const GenreSchema: z.ZodEnum<["apocalypse", "interstellar", "onlinegame", "rebirth", "system", "xuanhuan", "xianxia", "urban", "horror", "other"]>;
export type Genre = z.infer<typeof GenreSchema>;
export declare const BookStatusSchema: z.ZodEnum<["incubating", "outlining", "active", "paused", "completed", "dropped"]>;
export type BookStatus = z.infer<typeof BookStatusSchema>;
export declare const BookConfigSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    platform: z.ZodEnum<["tomato", "feilu", "qidian", "other"]>;
    genre: z.ZodEnum<["apocalypse", "interstellar", "onlinegame", "rebirth", "system", "xuanhuan", "xianxia", "urban", "horror", "other"]>;
    status: z.ZodEnum<["incubating", "outlining", "active", "paused", "completed", "dropped"]>;
    targetChapters: z.ZodDefault<z.ZodNumber>;
    chapterWordCount: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped";
    id: string;
    title: string;
    platform: "tomato" | "feilu" | "qidian" | "other";
    genre: "other" | "apocalypse" | "interstellar" | "onlinegame" | "rebirth" | "system" | "xuanhuan" | "xianxia" | "urban" | "horror";
    targetChapters: number;
    chapterWordCount: number;
    createdAt: string;
    updatedAt: string;
}, {
    status: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped";
    id: string;
    title: string;
    platform: "tomato" | "feilu" | "qidian" | "other";
    genre: "other" | "apocalypse" | "interstellar" | "onlinegame" | "rebirth" | "system" | "xuanhuan" | "xianxia" | "urban" | "horror";
    createdAt: string;
    updatedAt: string;
    targetChapters?: number | undefined;
    chapterWordCount?: number | undefined;
}>;
export type BookConfig = z.infer<typeof BookConfigSchema>;
//# sourceMappingURL=book.d.ts.map