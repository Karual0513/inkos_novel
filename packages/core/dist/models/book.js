import { z } from "zod";
export const PlatformSchema = z.enum(["tomato", "feilu", "qidian", "other"]);
export const GenreSchema = z.enum([
    "apocalypse",
    "interstellar",
    "onlinegame",
    "rebirth",
    "system",
    "xuanhuan",
    "xianxia",
    "urban",
    "horror",
    "other",
]);
export const BookStatusSchema = z.enum([
    "incubating",
    "outlining",
    "active",
    "paused",
    "completed",
    "dropped",
]);
export const BookConfigSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    platform: PlatformSchema,
    genre: GenreSchema,
    status: BookStatusSchema,
    targetChapters: z.number().int().min(1).default(200),
    chapterWordCount: z.number().int().min(1000).default(3000),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
//# sourceMappingURL=book.js.map