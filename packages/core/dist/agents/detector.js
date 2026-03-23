/**
 * AIGC detection — calls external API (GPTZero, Originality, or custom endpoint).
 * Not a BaseAgent subclass since it doesn't use the LLM provider.
 */
/**
 * Detect AI-generated content by calling an external detection API.
 * Returns a normalized score between 0 (human) and 1 (AI).
 */
export async function detectAIContent(config, content) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
        throw new Error(`Detection API key not found. Set ${config.apiKeyEnv} in your environment.`);
    }
    const detectedAt = new Date().toISOString();
    switch (config.provider) {
        case "gptzero":
            return detectGPTZero(config.apiUrl, apiKey, content, detectedAt);
        case "originality":
            return detectOriginality(config.apiUrl, apiKey, content, detectedAt);
        case "custom":
            return detectCustom(config.apiUrl, apiKey, content, detectedAt);
    }
}
async function detectGPTZero(apiUrl, apiKey, content, detectedAt) {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ document: content }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`GPTZero API failed: ${response.status} ${body}`);
    }
    const data = await response.json();
    const documents = data.documents;
    const score = documents?.[0]?.completely_generated_prob ?? 0;
    return { score, provider: "gptzero", detectedAt, raw: data };
}
async function detectOriginality(apiUrl, apiKey, content, detectedAt) {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ content }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Originality API failed: ${response.status} ${body}`);
    }
    const data = await response.json();
    const score = data.score?.ai ?? 0;
    return { score, provider: "originality", detectedAt, raw: data };
}
async function detectCustom(apiUrl, apiKey, content, detectedAt) {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ content }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Detection API failed: ${response.status} ${body}`);
    }
    const data = await response.json();
    // Custom endpoint must return { score: number } at minimum
    const score = typeof data.score === "number" ? data.score : 0;
    return { score, provider: "custom", detectedAt, raw: data };
}
//# sourceMappingURL=detector.js.map