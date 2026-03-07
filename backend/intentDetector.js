const { pipeline, env } = require("@xenova/transformers");

env.allowLocalModels = false;
env.useBrowserCache = false;

let embedder = null;
let intentEmbeddingsCache = null;

const INTENT_DESCRIPTIONS = {
    debugging: [
        "fix a bug or error in the code",
        "debug a runtime exception or crash",
        "troubleshoot why something is not working",
        "resolve a 500 internal server error",
        "find and fix a memory leak or segfault"
    ],
    explanation: [
        "explain a concept or technology",
        "describe how something works internally",
        "give an overview of architecture or design pattern",
        "what is the meaning and purpose of this",
        "summarize and clarify the theory behind this"
    ],
    implementation: [
        "write code to build a new feature",
        "implement a function or component step by step",
        "create a working example with setup instructions",
        "how to integrate and configure this library",
        "build and deploy an application from scratch"
    ],
    comparison: [
        "compare two technologies or approaches",
        "what are the differences between these options",
        "pros and cons of each alternative",
        "which one is better and why",
        "evaluate tradeoffs between multiple choices"
    ],
    optimization: [
        "optimize code for better performance",
        "reduce latency and improve speed",
        "make this more efficient and scalable",
        "find and fix performance bottlenecks",
        "improve memory usage and reduce bundle size"
    ]
};

async function getEmbedder() {
    if (!embedder) {
        console.log("[IntentDetector] Loading all-MiniLM-L6-v2 model (first time only)...");
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        console.log("[IntentDetector] Model loaded successfully.");
    }
    return embedder;
}

function cosineSimilarity(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function meanPool(embedding) {
    const dims = embedding[0].length;
    const pooled = new Array(dims).fill(0);
    for (let i = 0; i < embedding.length; i++) {
        for (let j = 0; j < dims; j++) {
            pooled[j] += embedding[i][j];
        }
    }
    for (let j = 0; j < dims; j++) {
        pooled[j] /= embedding.length;
    }
    return pooled;
}

async function getIntentEmbeddings(extractor) {
    if (intentEmbeddingsCache) return intentEmbeddingsCache;

    console.log("[IntentDetector] Computing intent reference embeddings...");
    const cache = {};

    for (const [intent, descriptions] of Object.entries(INTENT_DESCRIPTIONS)) {
        const embeddings = [];
        for (const desc of descriptions) {
            const output = await extractor(desc, { pooling: "mean", normalize: true });
            embeddings.push(Array.from(output.data));
        }
        cache[intent] = meanPool(embeddings);
    }

    intentEmbeddingsCache = cache;
    console.log("[IntentDetector] Intent embeddings cached.");
    return cache;
}

async function detectIntent(query) {
    const extractor = await getEmbedder();
    const intentEmbeddings = await getIntentEmbeddings(extractor);

    const queryOutput = await extractor(query, { pooling: "mean", normalize: true });
    const queryVec = Array.from(queryOutput.data);

    const scores = {};
    let bestIntent = "explanation";
    let bestScore = -1;

    for (const [intent, intentVec] of Object.entries(intentEmbeddings)) {
        const score = cosineSimilarity(queryVec, intentVec);
        scores[intent] = parseFloat(score.toFixed(4));

        if (score > bestScore) {
            bestScore = score;
            bestIntent = intent;
        }
    }

    return {
        intent: bestIntent,
        confidence: parseFloat(bestScore.toFixed(4)),
        scores
    };
}

async function warmUp() {
    try {
        await getEmbedder();
        const extractor = await getEmbedder();
        await getIntentEmbeddings(extractor);
        console.log("[IntentDetector] Warm-up complete.");
    } catch (err) {
        console.error("[IntentDetector] Warm-up failed:", err.message);
    }
}

module.exports = { detectIntent, warmUp };
