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
            "xuanhuan",
            "xianxia",
            "urban",
            "horror",
            "rebirth",
            "system",
            "onlinegame",
            "apocalypse",
            "interstellar",
            "infinite",
            "strange-rules",
            "lord",
            "management",
            "family",
            "court-politics",
            "entertainment",
            "simulator",
            "checkin",
            "cyberpunk",
            "harem-household",
            "detective",
            "tycoon",
            "multiverse",
            "mastermind",
            "identities",
            "medical",
            "esports",
            "folklore",
            "mecha",
            "son-in-law",
            "treasure",
            "conquest",
            "construction",
            "arranged-love",
            "chasing-love",
            "parenting",
            "workplace",
            "quick-transmigration",
            "period-life",
            "showbiz",
            "female-mystery",
            "healing",
            "locked-room",
            "cthulhu",
            "survival-horror",
            "campus-horror",
            "livestream-horror",
            "time-loop",
            "ai-awakening",
            "first-contact",
            "space-colony",
            "hard-sf",
            "wasteland",
            "espionage",
            "bureaucracy",
            "business-war",
            "legal",
            "archaeology",
            "travel-adventure",
            "sports",
            "other",
        ]));
        for (const id of [
            "xuanhuan",
            "xianxia",
            "urban",
            "horror",
            "rebirth",
            "system",
            "onlinegame",
            "apocalypse",
            "interstellar",
            "infinite",
            "strange-rules",
            "lord",
            "management",
            "family",
            "court-politics",
            "entertainment",
            "simulator",
            "checkin",
            "cyberpunk",
            "harem-household",
            "detective",
            "tycoon",
            "multiverse",
            "mastermind",
            "identities",
            "medical",
            "esports",
            "folklore",
            "mecha",
            "son-in-law",
            "treasure",
            "conquest",
            "construction",
            "arranged-love",
            "chasing-love",
            "parenting",
            "workplace",
            "quick-transmigration",
            "period-life",
            "showbiz",
            "female-mystery",
            "healing",
            "locked-room",
            "cthulhu",
            "survival-horror",
            "campus-horror",
            "livestream-horror",
            "time-loop",
            "ai-awakening",
            "first-contact",
            "space-colony",
            "hard-sf",
            "wasteland",
            "espionage",
            "bureaucracy",
            "business-war",
            "legal",
            "archaeology",
            "travel-adventure",
            "sports",
            "other",
        ]) {
            expect(genres.find((genre) => genre.id === id)).toMatchObject({
                id,
                source: "builtin",
            });
        }
    });
    it("parses a newly added strategy-oriented built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "lord");
        expect(profile).toMatchObject({
            id: "lord",
            name: "领主流",
            numericalSystem: true,
            powerScaling: true,
        });
        expect(profile.chapterTypes).toContain("建设章");
        expect(profile.satisfactionTypes).toContain("领地升级");
        expect(body).toContain("## 领地规则");
    });
    it("parses a newly added competitive built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "mecha");
        expect(profile).toMatchObject({
            id: "mecha",
            name: "机甲流",
            numericalSystem: true,
            powerScaling: true,
        });
        expect(profile.chapterTypes).toContain("作战章");
        expect(profile.satisfactionTypes).toContain("机体升级");
        expect(body).toContain("## 机体规则");
    });
    it("parses a newly added relationship-oriented built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "arranged-love");
        expect(profile).toMatchObject({
            id: "arranged-love",
            name: "先婚后爱",
            numericalSystem: false,
            powerScaling: false,
        });
        expect(profile.chapterTypes).toContain("磨合章");
        expect(profile.satisfactionTypes).toContain("婚姻转真爱");
        expect(body).toContain("## 感情规则");
    });
    it("parses a newly added suspense-oriented built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "locked-room");
        expect(profile).toMatchObject({
            id: "locked-room",
            name: "本格密室",
            numericalSystem: false,
            powerScaling: false,
        });
        expect(profile.chapterTypes).toContain("推理章");
        expect(profile.satisfactionTypes).toContain("诡计拆解");
        expect(body).toContain("## 密室规则");
    });
    it("parses a newly added science-fiction built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "time-loop");
        expect(profile).toMatchObject({
            id: "time-loop",
            name: "时间循环",
            numericalSystem: true,
            powerScaling: false,
        });
        expect(profile.chapterTypes).toContain("变量章");
        expect(profile.satisfactionTypes).toContain("循环破除");
        expect(body).toContain("## 循环规则");
    });
    it("parses a newly added reality-oriented built-in genre profile", async () => {
        const { profile, body } = await readGenreProfile(tempDir, "legal");
        expect(profile).toMatchObject({
            id: "legal",
            name: "律政流",
            numericalSystem: false,
            powerScaling: false,
        });
        expect(profile.chapterTypes).toContain("庭辩章");
        expect(profile.satisfactionTypes).toContain("法庭逆转");
        expect(body).toContain("## 律政规则");
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