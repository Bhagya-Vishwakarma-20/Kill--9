const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
    });
    return result.embedding.values;
}

async function getEmbeddings(texts) {
    const embeddings = [];
    for (let text of texts) {
        const emb = await getEmbedding(text);
        embeddings.push(emb);
    }
    return embeddings;
}

module.exports = { getEmbedding, getEmbeddings };
