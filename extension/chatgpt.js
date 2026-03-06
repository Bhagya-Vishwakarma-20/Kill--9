const API_URL = "http://localhost:3000";
let selectedBucketId = null;

// Build the floating widget
function createWidget() {
    const widget = document.createElement("div");
    widget.id = "cs-widget";

    widget.innerHTML = `
    <div id="cs-panel">
      <h3>⚡ Context Stack</h3>
      <select id="cs-bucket-select">
        <option value="">Loading buckets...</option>
      </select>
      <div id="cs-status">Select a bucket to enable RAG</div>
      <div class="cs-hint">
        Type your question, then press<br>
        <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to inject context
      </div>
    </div>
    <button id="cs-toggle-btn" title="Context Stack">⚡</button>
  `;

    document.body.appendChild(widget);

    // Toggle panel
    document.getElementById("cs-toggle-btn").addEventListener("click", () => {
        document.getElementById("cs-panel").classList.toggle("open");
    });

    // Load buckets
    loadBuckets();

    // Bucket selection
    document.getElementById("cs-bucket-select").addEventListener("change", (e) => {
        selectedBucketId = e.target.value || null;
        const status = document.getElementById("cs-status");
        if (selectedBucketId) {
            status.textContent = "✅ RAG active — Ctrl+Enter to inject context";
            status.className = "active";
            // Save selection
            chrome.storage.local.set({ lastBucketId: selectedBucketId });
        } else {
            status.textContent = "Select a bucket to enable RAG";
            status.className = "";
        }
    });
}

async function loadBuckets() {
    const select = document.getElementById("cs-bucket-select");
    try {
        const res = await fetch(`${API_URL}/buckets`);
        const buckets = await res.json();

        select.innerHTML = '<option value="">-- Select Bucket --</option>';
        buckets.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = b.name;
            select.appendChild(opt);
        });

        // Auto-select last used bucket or most recent
        chrome.storage.local.get("lastBucketId", (data) => {
            if (data.lastBucketId) {
                select.value = data.lastBucketId;
                selectedBucketId = data.lastBucketId;
                document.getElementById("cs-status").textContent = "✅ RAG active — Ctrl+Enter to inject context";
                document.getElementById("cs-status").className = "active";
            } else if (buckets.length > 0) {
                // Default to most recent bucket
                select.value = buckets[0].id;
                selectedBucketId = String(buckets[0].id);
                document.getElementById("cs-status").textContent = "✅ RAG active — Ctrl+Enter to inject context";
                document.getElementById("cs-status").className = "active";
            }
        });
    } catch (err) {
        select.innerHTML = '<option value="">Backend offline</option>';
    }
}

// Get the ChatGPT input textarea
function getChatGPTInput() {
    // ChatGPT uses a contenteditable div with id="prompt-textarea"
    return document.getElementById("prompt-textarea");
}

// Get text from the ChatGPT input
function getInputText(input) {
    if (!input) return "";
    return input.innerText || input.textContent || "";
}

// Set text in the ChatGPT input
function setInputText(input, text) {
    if (!input) return;

    // Clear existing content
    input.innerHTML = "";

    // Create a paragraph with the text
    const p = document.createElement("p");
    p.textContent = text;
    input.appendChild(p);

    // Trigger input event so ChatGPT detects the change
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

// Fetch relevant chunks and inject into ChatGPT input
async function injectContext() {
    if (!selectedBucketId) {
        showFloatingStatus("Select a bucket first!", "error");
        return;
    }

    const input = getChatGPTInput();
    const userQuery = getInputText(input).trim();

    if (!userQuery) {
        showFloatingStatus("Type a question first!", "error");
        return;
    }

    showFloatingStatus("🔍 Fetching relevant context...", "");

    try {
        const res = await fetch(`${API_URL}/retrieve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: userQuery,
                bucket_id: parseInt(selectedBucketId),
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            showFloatingStatus(data.error, "error");
            return;
        }

        if (!data.context || data.chunks.length === 0) {
            showFloatingStatus("No relevant context found", "error");
            return;
        }

        // Build the augmented prompt
        const augmentedPrompt = `Use the context below to answer the user question.

Context:
${data.context}

Question:
${userQuery}

Answer clearly.`;

        // Inject into ChatGPT input
        setInputText(input, augmentedPrompt);

        showFloatingStatus(`✅ Injected ${data.chunks.length} chunks! Hit Enter to send`, "active");
    } catch (err) {
        showFloatingStatus("Backend offline: " + err.message, "error");
    }
}

function showFloatingStatus(msg, type) {
    const status = document.getElementById("cs-status");
    if (status) {
        status.textContent = msg;
        status.className = type;
    }
}

// Listen for Ctrl+Enter
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
        const input = getChatGPTInput();
        // Only intercept if the ChatGPT input is focused or has content
        if (input && getInputText(input).trim()) {
            e.preventDefault();
            e.stopPropagation();
            injectContext();
        }
    }
}, true);

// Create widget when page is ready
createWidget();
