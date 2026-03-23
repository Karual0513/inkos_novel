import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listAvailableGenres, readGenreProfile } from "../agents/rules-reader.js";
describe("rules-reader", () => {
    let tempDir;
    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "inkos-rules-reader-"));
    });
    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });
    it("lists newly added built-in genres", async () => {
        const genres = await listAvailableGenres(tempDir);
        const ids = genres.map((genre) => genre.id);
        expect(ids).toEqual(expect.arrayContaining([
            "apocalypse",
            "interstellar",
            "onlinegame",
            "rebirth",
            "system",
        ]));
        for (const id of ["apocalypse", "interstellar", "onlinegame", "rebirth", "system"]) {
            expect(genres.find((genre) => genre.id === id)).toMatchObject({
                id,
                source: "builtin",
            });
        }
    });
    it("parses a newly added built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "rebirth");
        expect(profile).toMatchObject({
            id: "rebirth",
            name: "重生流",
            numericalSystem: false,
            powerScaling: false,
        });
        expect(profile.chapterTypes.length).toBeGreaterThan(0);
        expect(profile.satisfactionTypes).toContain("命运改写");
        expect(body).toContain("## 时间差与信息优势约束");
    });
    it("prefers project-level overrides over built-in genre profiles", async () => {
        const genresDir = join(tempDir, "genres");
        await mkdir(genresDir, { recursive: true });
        await writeFile(join(genresDir, "rebirth.md"), `---
name: 本地重生流
id: rebirth
chapterTypes: ["自定义章"]
fatigueWords: ["自定义词"]
numericalSystem: false
powerScaling: false
eraResearch: false
pacingRule: "项目覆盖生效"
satisfactionTypes: ["本地收益"]
auditDimensions: [1,2,3]
---

## 题材禁忌

- 项目级覆写

## 叙事指导

项目级内容优先。
`, "utf-8");
        const { profile, body } = await readGenreProfile(tempDir, "rebirth");
        const genres = await listAvailableGenres(tempDir);
        expect(profile.name).toBe("本地重生流");
        expect(profile.chapterTypes).toEqual(["自定义章"]);
        expect(body).toContain("项目级内容优先");
        expect(genres.find((genre) => genre.id === "rebirth")).toMatchObject({
            id: "rebirth",
            name: "本地重生流",
            source: "project",
        });
    });
});
//# sourceMappingURL=rules-reader.test.js.map