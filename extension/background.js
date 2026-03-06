const API_URL = "http://localhost:3000";


chrome.runtime.onInstalled.addListener(() => {
    console.log("Context Stack extension installed");
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "loadContextFromPage") {
        handleLoadContext(request.content, sender.tab?.id);
    }
    return false;
});

async function handleLoadContext(content, tabId) {
    if (!content || !content.text) {
        showNotification(tabId, "Could not extract page content");
        return;
    }


    const data = await chrome.storage.local.get("lastBucketId");
    let bucketId = data.lastBucketId;

    if (!bucketId) {

        try {
            const res = await fetch(`${API_URL}/buckets`);
            const buckets = await res.json();
            if (buckets.length > 0) {
                bucketId = String(buckets[0].id);
                chrome.storage.local.set({ lastBucketId: bucketId });
            } else {
                showNotification(tabId, "No buckets found. Create one first.");
                return;
            }
        } catch (err) {
            showNotification(tabId, "Backend offline");
            return;
        }
    }

    showNotification(tabId, `Saving ${content.text.length} chars... `);

    try {
        const res = await fetch(`${API_URL}/context`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: content.url,
                title: content.title,
                text: content.text,
                bucket_id: parseInt(bucketId),
            }),
        });

        const result = await res.json();

        if (res.ok) {
            showNotification(tabId, `Saved! ${result.chunks_count} chunks stored`);
        } else {
            showNotification(tabId, result.error || "Failed to save");
        }
    } catch (err) {
        showNotification(tabId, "Backend offline");
    }
}


function showNotification(tabId, message) {
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, {
        action: "showNotification",
        message: message,
    });
}
