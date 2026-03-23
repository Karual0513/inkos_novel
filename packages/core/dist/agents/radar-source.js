/**
 * Wraps raw natural language text as a radar source.
 * Use this to inject external analysis (e.g. from OpenClaw) into the radar pipeline.
 */
export class TextRadarSource {
    name;
    text;
    constructor(text, name = "external") {
        this.name = name;
        this.text = text;
    }
    async fetch() {
        return {
            platform: this.name,
            entries: [{ title: this.text, author: "", category: "", extra: "[外部分析]" }],
        };
    }
}
// ---------------------------------------------------------------------------
// Built-in sources
// ---------------------------------------------------------------------------
const FANQIE_RANK_TYPES = [
    { sideType: 10, label: "热门榜" },
    { sideType: 13, label: "黑马榜" },
];
export class FanqieRadarSource {
    name = "fanqie";
    async fetch() {
        const entries = [];
        for (const { sideType, label } of FANQIE_RANK_TYPES) {
            try {
                const url = `https://api-lf.fanqiesdk.com/api/novel/channel/homepage/rank/rank_list/v2/?aid=13&limit=15&offset=0&side_type=${sideType}`;
                const res = await globalThis.fetch(url, {
                    headers: { "User-Agent": "Mozilla/5.0 (compatible; InkOS/0.1)" },
                });
                if (!res.ok)
                    continue;
                const data = (await res.json());
                const list = data.data?.result;
                if (!Array.isArray(list))
                    continue;
                for (const item of list) {
                    const rec = item;
                    entries.push({
                        title: String(rec.book_name ?? ""),
                        author: String(rec.author ?? ""),
                        category: String(rec.category ?? ""),
                        extra: `[${label}]`,
                    });
                }
            }
            catch {
                // skip on network error
            }
        }
        return { platform: "番茄小说", entries };
    }
}
export class QidianRadarSource {
    name = "qidian";
    async fetch() {
        const entries = [];
        try {
            const url = "https://www.qidian.com/rank/";
            const res = await globalThis.fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
            });
            if (!res.ok)
                return { platform: "起点中文网", entries };
            const html = await res.text();
            const bookPattern = /<a[^>]*href="\/\/book\.qidian\.com\/info\/(\d+)"[^>]*>([^<]+)<\/a>/g;
            let match;
            const seen = new Set();
            while ((match = bookPattern.exec(html)) !== null) {
                const title = match[2].trim();
                if (title && !seen.has(title) && title.length > 1 && title.length < 30) {
                    seen.add(title);
                    entries.push({ title, author: "", category: "", extra: "[起点热榜]" });
                }
                if (entries.length >= 20)
                    break;
            }
        }
        catch {
            // skip on network error
        }
        return { platform: "起点中文网", entries };
    }
}
//# sourceMappingURL=radar-source.js.map