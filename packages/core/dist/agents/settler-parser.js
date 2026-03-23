export function parseSettlementOutput(content, genreProfile) {
    const extract = (tag) => {
        const regex = new RegExp(`=== ${tag} ===\\s*([\\s\\S]*?)(?==== [A-Z_]+ ===|$)`);
        const match = content.match(regex);
        return match?.[1]?.trim() ?? "";
    };
    return {
        postSettlement: extract("POST_SETTLEMENT"),
        updatedState: extract("UPDATED_STATE") || "(状态卡未更新)",
        updatedLedger: genreProfile.numericalSystem
            ? (extract("UPDATED_LEDGER") || "(账本未更新)")
            : "",
        updatedHooks: extract("UPDATED_HOOKS") || "(伏笔池未更新)",
        chapterSummary: extract("CHAPTER_SUMMARY"),
        updatedSubplots: extract("UPDATED_SUBPLOTS"),
        updatedEmotionalArcs: extract("UPDATED_EMOTIONAL_ARCS"),
        updatedCharacterMatrix: extract("UPDATED_CHARACTER_MATRIX"),
    };
}
//# sourceMappingURL=settler-parser.js.map