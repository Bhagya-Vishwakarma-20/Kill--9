
function chunkText(text, chunkSize = 2000, overlap = 200) {
    let chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        if (end < text.length) {
            let breakPoint = text.lastIndexOf(".", end);
            if (breakPoint > start + chunkSize / 2) {
                end = breakPoint + 1;
            }
        }

        let chunk = text.slice(start, end).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        start = end - overlap;
    }

    return chunks;
}

module.exports = { chunkText };
