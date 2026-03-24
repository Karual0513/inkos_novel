import { z } from "zod";
export declare const PlatformSchema: z.ZodEnum<["tomato", "feilu", "qidian", "other"]>;
export type Platform = z.infer<typeof PlatformSchema>;
export declare const GenreSchema: z.ZodEnum<["xuanhuan", "xianxia", "urban", "horror", "rebirth", "system", "onlinegame", "apocalypse", "interstellar", "infinite", "strange-rules", "lord", "management", "family", "court-politics", "entertainment", "simulator", "checkin", "cyberpunk", "harem-household", "detective", "tycoon", "multiverse", "mastermind", "identities", "medical", "esports", "folklore", "mecha", "son-in-law", "treasure", "conquest", "construction", "arranged-love", "chasing-love", "parenting", "workplace", "quick-transmigration", "period-life", "showbiz", "female-mystery", "healing", "locked-room", "cthulhu", "survival-horror", "campus-horror", "livestream-horror", "time-loop", "ai-awakening", "first-contact", "space-colony", "hard-sf", "wasteland", "espionage", "bureaucracy", "business-war", "legal", "archaeology", "travel-adventure", "sports", "other"]>;
export type Genre = z.infer<typeof GenreSchema>;
export declare const BookStatusSchema: z.ZodEnum<["incubating", "outlining", "active", "paused", "completed", "dropped"]>;
export type BookStatus = z.infer<typeof BookStatusSchema>;
export declare const BookConfigSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    platform: z.ZodEnum<["tomato", "feilu", "qidian", "other"]>;
    genre: z.ZodEnum<["xuanhuan", "xianxia", "urban", "horror", "rebirth", "system", "onlinegame", "apocalypse", "interstellar", "infinite", "strange-rules", "lord", "management", "family", "court-politics", "entertainment", "simulator", "checkin", "cyberpunk", "harem-household", "detective", "tycoon", "multiverse", "mastermind", "identities", "medical", "esports", "folklore", "mecha", "son-in-law", "treasure", "conquest", "construction", "arranged-love", "chasing-love", "parenting", "workplace", "quick-transmigration", "period-life", "showbiz", "female-mystery", "healing", "locked-room", "cthulhu", "survival-horror", "campus-horror", "livestream-horror", "time-loop", "ai-awakening", "first-contact", "space-colony", "hard-sf", "wasteland", "espionage", "bureaucracy", "business-war", "legal", "archaeology", "travel-adventure", "sports", "other"]>;
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
    genre: "other" | "xuanhuan" | "xianxia" | "urban" | "horror" | "rebirth" | "system" | "onlinegame" | "apocalypse" | "interstellar" | "infinite" | "strange-rules" | "lord" | "management" | "family" | "court-politics" | "entertainment" | "simulator" | "checkin" | "cyberpunk" | "harem-household" | "detective" | "tycoon" | "multiverse" | "mastermind" | "identities" | "medical" | "esports" | "folklore" | "mecha" | "son-in-law" | "treasure" | "conquest" | "construction" | "arranged-love" | "chasing-love" | "parenting" | "workplace" | "quick-transmigration" | "period-life" | "showbiz" | "female-mystery" | "healing" | "locked-room" | "cthulhu" | "survival-horror" | "campus-horror" | "livestream-horror" | "time-loop" | "ai-awakening" | "first-contact" | "space-colony" | "hard-sf" | "wasteland" | "espionage" | "bureaucracy" | "business-war" | "legal" | "archaeology" | "travel-adventure" | "sports";
    targetChapters: number;
    chapterWordCount: number;
    createdAt: string;
    updatedAt: string;
}, {
    status: "incubating" | "outlining" | "active" | "paused" | "completed" | "dropped";
    id: string;
    title: string;
    platform: "tomato" | "feilu" | "qidian" | "other";
    genre: "other" | "xuanhuan" | "xianxia" | "urban" | "horror" | "rebirth" | "system" | "onlinegame" | "apocalypse" | "interstellar" | "infinite" | "strange-rules" | "lord" | "management" | "family" | "court-politics" | "entertainment" | "simulator" | "checkin" | "cyberpunk" | "harem-household" | "detective" | "tycoon" | "multiverse" | "mastermind" | "identities" | "medical" | "esports" | "folklore" | "mecha" | "son-in-law" | "treasure" | "conquest" | "construction" | "arranged-love" | "chasing-love" | "parenting" | "workplace" | "quick-transmigration" | "period-life" | "showbiz" | "female-mystery" | "healing" | "locked-room" | "cthulhu" | "survival-horror" | "campus-horror" | "livestream-horror" | "time-loop" | "ai-awakening" | "first-contact" | "space-colony" | "hard-sf" | "wasteland" | "espionage" | "bureaucracy" | "business-war" | "legal" | "archaeology" | "travel-adventure" | "sports";
    createdAt: string;
    updatedAt: string;
    targetChapters?: number | undefined;
    chapterWordCount?: number | undefined;
}>;
export type BookConfig = z.infer<typeof BookConfigSchema>;
//# sourceMappingURL=book.d.ts.map