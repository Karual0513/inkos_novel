import { z } from "zod";
import yaml from "js-yaml";
export const GenreProfileSchema = z.object({
    name: z.string(),
    id: z.string(),
    chapterTypes: z.array(z.string()),
    fatigueWords: z.array(z.string()),
    numericalSystem: z.boolean().default(false),
    powerScaling: z.boolean().default(false),
    eraResearch: z.boolean().default(false),
    pacingRule: z.string().default(""),
    satisfactionTypes: z.array(z.string()).default([]),
    auditDimensions: z.array(z.number()).default([]),
});
export function parseGenreProfile(raw) {
    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!fmMatch) {
        throw new Error("Genre profile missing YAML frontmatter (--- ... ---)");
    }
    const frontmatter = yaml.load(fmMatch[1]);
    const profile = GenreProfileSchema.parse(frontmatter);
    const body = fmMatch[2].trim();
    return { profile, body };
}
//# sourceMappingURL=genre-profile.js.map