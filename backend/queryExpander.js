const INTENT_SUFFIXES = {
    debugging: "fix resolve troubleshoot error solution",
    explanation: "explain concept overview meaning",
    implementation: "implement code example setup guide",
    comparison: "compare difference pros cons tradeoff",
    optimization: "optimize performance improve efficient speed"
};

function expandQuery(query, intent) {
    const cleanedQuery = query
        .replace(/[?!.]+$/g, "")
        .replace(/\b(please|can you|could you|i need to|i want to|help me)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    const suffix = INTENT_SUFFIXES[intent] || "";
    const expandedQuery = `${intent} ${cleanedQuery} ${suffix}`.trim();

    return expandedQuery;
}

module.exports = { expandQuery };
