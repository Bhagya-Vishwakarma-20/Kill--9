const API_URL = "http://localhost:3000";
let selectedBucketId = null;
let panelOpen = false;

const STACK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  <path d="M2 17l10 5 10-5"/>
  <path d="M2 12l10 5 10-5"/>
</svg>`;

function closePanel() {
    panelOpen = false;
    const p = document.getElementById("cs-panel");
    const btn = document.getElementById("cs-toggle-btn");
    if (p) p.classList.remove("open");
    if (btn) btn.classList.remove("active");
    updateBucketLabel();
}

function updateBucketLabel() {
    const label = document.getElementById("cs-bucket-label");
    const select = document.getElementById("cs-bucket-select");
    if (!label || !select) return;
    const selected = select.options[select.selectedIndex];
    if (selected && selected.value) {
        label.textContent = selected.textContent;
    } else {
        label.textContent = "";
    }
}

function init() {
    const widget = document.createElement("div");
    widget.id = "cs-widget";
    widget.innerHTML = `
    <button id="cs-toggle-btn" title="Context Stack">
      ${STACK_ICON}
      <span id="cs-bucket-label"></span>
    </button>
  `;
    document.body.appendChild(widget);

    const panel = document.createElement("div");
    panel.id = "cs-panel";
    panel.innerHTML = `
    <div id="cs-panel-header">
      ${STACK_ICON}
      Context Stack
    </div>
    <select id="cs-bucket-select">
      <option value="">Loading buckets...</option>
    </select>
    <div id="cs-status">Select a bucket</div>
    <div class="cs-hint">
      Type your question, then press<br>
      <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to inject context
    </div>
  `;
    document.body.appendChild(panel);

    document.getElementById("cs-toggle-btn").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        panelOpen = !panelOpen;
        const p = document.getElementById("cs-panel");
        const btn = document.getElementById("cs-toggle-btn");

        if (panelOpen) {
            p.classList.add("open");
            btn.classList.add("active");
            positionPanel();
        } else {
            p.classList.remove("open");
            btn.classList.remove("active");
        }
    });

    panel.addEventListener("mousedown", (e) => {
        e.stopPropagation();
    });

    document.addEventListener("mousedown", (e) => {
        if (!panelOpen) return;
        const p = document.getElementById("cs-panel");
        const btn = document.getElementById("cs-toggle-btn");
        if (p && !p.contains(e.target) && btn && !btn.contains(e.target)) {
            closePanel();
        }
    });

    document.getElementById("cs-bucket-select").addEventListener("change", (e) => {
        e.stopPropagation();
        selectedBucketId = e.target.value || null;
        if (selectedBucketId) {
            updateStatus("Active — Ctrl+Enter to inject", "active");
            chrome.storage.local.set({ lastBucketId: selectedBucketId });
            updateBucketLabel();
        } else {
            updateStatus("Select a bucket", "");
        }
    });

    positionWidget();
    setInterval(positionWidget, 1000);

    loadBuckets();
}

function positionWidget() {
    const composer = document.querySelector('[class*="bg-token-bg-primary"][class*="grid"]');
    const widget = document.getElementById("cs-widget");
    if (!widget) return;

    if (composer) {
        const rect = composer.getBoundingClientRect();
        widget.style.bottom = (window.innerHeight - rect.bottom + 10) + "px";
        const gap = 12;
        widget.style.right = (window.innerWidth - rect.right - gap) + "px";
        widget.style.left = (rect.right + gap) + "px";
        widget.style.right = "auto";
    } else {
        widget.style.bottom = "90px";
        widget.style.right = "24px";
        widget.style.left = "auto";
    }
}

function positionPanel() {
    const btn = document.getElementById("cs-toggle-btn");
    const panel = document.getElementById("cs-panel");
    if (!btn || !panel) return;

    const rect = btn.getBoundingClientRect();
    panel.style.bottom = (window.innerHeight - rect.top + 8) + "px";
    panel.style.right = (window.innerWidth - rect.right + 8) + "px";
}

async function loadBuckets() {
    const select = document.getElementById("cs-bucket-select");
    if (!select) return;

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

        chrome.storage.local.get("lastBucketId", (data) => {
            if (data.lastBucketId) {
                select.value = data.lastBucketId;
                selectedBucketId = data.lastBucketId;
                updateStatus("Active — Ctrl+Enter to inject", "active");
                updateBucketLabel();
            } else if (buckets.length > 0) {
                select.value = buckets[0].id;
                selectedBucketId = String(buckets[0].id);
                updateStatus("Active — Ctrl+Enter to inject", "active");
                updateBucketLabel();
            }
        });
    } catch (err) {
        select.innerHTML = '<option value="">Backend offline</option>';
    }
}

function updateStatus(msg, type) {
    const status = document.getElementById("cs-status");
    if (status) {
        status.textContent = msg;
        status.className = type || "";
    }
}

function getChatGPTInput() {
    return document.getElementById("prompt-textarea");
}

function getInputText(input) {
    if (!input) return "";
    return input.innerText || input.textContent || "";
}

function setInputText(input, text) {
    if (!input) return;
    input.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = text;
    input.appendChild(p);
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

function showOverlay() {
    if (document.getElementById("cs-overlay")) return;
    const composer = document.querySelector('[class*="bg-token-bg-primary"][class*="grid"]');
    const target = composer || document.querySelector('form');
    if (!target) return;

    const overlay = document.createElement("div");
    overlay.id = "cs-overlay";
    overlay.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
        border-radius: 12px;
        z-index: 99998;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #ececec;
        font-family: 'Söhne', system-ui, sans-serif;
        font-size: 13px;
    `;
    overlay.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" style="animation: cs-spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10" stroke="#10a37f" stroke-width="2.5" fill="none"
                stroke-dasharray="50" stroke-linecap="round"/>
        </svg>
        <span>Fetching context...</span>
        <style>@keyframes cs-spin { to { transform: rotate(360deg); } }</style>
    `;

    target.style.position = "relative";
    target.appendChild(overlay);
}

function hideOverlay() {
    const overlay = document.getElementById("cs-overlay");
    if (overlay) overlay.remove();
}

async function injectContext() {
    if (!selectedBucketId) {
        updateStatus("Select a bucket first", "error");
        return;
    }

    const input = getChatGPTInput();
    const userQuery = getInputText(input).trim();

    if (!userQuery) {
        updateStatus("Type a question first", "error");
        return;
    }

    updateStatus("Fetching context...", "");
    showOverlay();

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
            updateStatus(data.error, "error");
            hideOverlay();
            return;
        }

        if (!data.context || data.chunks.length === 0) {
            updateStatus("No relevant context found", "error");
            hideOverlay();
            return;
        }

        const augmentedPrompt = `Use the context below to answer the user question.

Context:
${data.context}

Question:
${userQuery}

Answer clearly.`;

        setInputText(input, augmentedPrompt);
        updateStatus(`Injected ${data.chunks.length} chunks — hit Enter`, "active");
    } catch (err) {
        updateStatus("Backend offline", "error");
    }

    hideOverlay();
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
        const input = getChatGPTInput();
        if (input && getInputText(input).trim()) {
            e.preventDefault();
            e.stopPropagation();
            injectContext();
        }
    }
}, true);

init();
