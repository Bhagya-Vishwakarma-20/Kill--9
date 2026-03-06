const API_URL = "http://localhost:3000";

const bucketSelect = document.getElementById("bucketSelect");
const newBucketName = document.getElementById("newBucketName");
const createBucketBtn = document.getElementById("createBucketBtn");
const bucketStatus = document.getElementById("bucketStatus");
const loadContextBtn = document.getElementById("loadContextBtn");
const contextStatus = document.getElementById("contextStatus");

function showStatus(el, message, type) {
    el.textContent = message;
    el.className = `status show ${type}`;
}

// Load buckets
async function loadBuckets() {
    try {
        const res = await fetch(`${API_URL}/buckets`);
        const buckets = await res.json();

        bucketSelect.innerHTML = "";

        if (buckets.length === 0) {
            bucketSelect.innerHTML = '<option value="">No buckets yet</option>';
            return;
        }

        buckets.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = b.name;
            bucketSelect.appendChild(opt);
        });
    } catch (err) {
        bucketSelect.innerHTML = '<option value="">Backend offline</option>';
    }
}

createBucketBtn.addEventListener("click", async () => {
    const name = newBucketName.value.trim();
    if (!name) {
        showStatus(bucketStatus, "Enter a bucket name", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/bucket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });

        const data = await res.json();

        if (!res.ok) {
            showStatus(bucketStatus, data.error, "error");
            return;
        }

        showStatus(bucketStatus, `Bucket "${name}" created!`, "success");
        newBucketName.value = "";
        await loadBuckets();
        bucketSelect.value = data.id;


        chrome.storage.local.set({ lastBucketId: String(data.id) });
    } catch (err) {
        showStatus(bucketStatus, "Backend offline", "error");
    }
});


loadContextBtn.addEventListener("click", async () => {
    const bucketId = bucketSelect.value;
    if (!bucketId) {
        showStatus(contextStatus, "Select a bucket first", "error");
        return;
    }

    loadContextBtn.disabled = true;
    showStatus(contextStatus, "📄 Extracting page content...", "loading");

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const content = await chrome.tabs.sendMessage(tab.id, { action: "getPageContent" });

        if (!content || !content.text) {
            showStatus(contextStatus, "Could not extract page content", "error");
            loadContextBtn.disabled = false;
            return;
        }

        showStatus(contextStatus, `⏳ Sending ${content.text.length} chars to backend...`, "loading");

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

        const data = await res.json();

        if (!res.ok) {
            showStatus(contextStatus, data.error, "error");
        } else {
            showStatus(contextStatus, `✅ Saved! ${data.chunks_count} chunks stored`, "success");
  
            chrome.storage.local.set({ lastBucketId: bucketId });
        }
    } catch (err) {
        showStatus(contextStatus, "Failed: " + err.message, "error");
    }

    loadContextBtn.disabled = false;
});

loadBuckets();
