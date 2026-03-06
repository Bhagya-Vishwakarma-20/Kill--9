const API_URL = "http://localhost:3000";
let selectedBucketIds = [];
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
    if (!label) return;
    if (selectedBucketIds.length === 0) {
        label.textContent = "";
    } else if (selectedBucketIds.length === 1) {
        const item = document.querySelector(`.cs-bucket-item[data-id="${selectedBucketIds[0]}"] .cs-bucket-name`);
        label.textContent = item ? item.textContent : "1 bucket";
    } else {
        label.textContent = `${selectedBucketIds.length} buckets`;
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
    <div id="cs-bucket-list-container">
      <div id="cs-bucket-list">
        <div class="cs-bucket-loading">Loading buckets...</div>
      </div>
    </div>
    <div id="cs-status">Select buckets</div>
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

function toggleBucket(id) {
    const idx = selectedBucketIds.indexOf(id);
    if (idx === -1) {
        selectedBucketIds.push(id);
    } else {
        selectedBucketIds.splice(idx, 1);
    }

    const item = document.querySelector(`.cs-bucket-item[data-id="${id}"]`);
    if (item) {
        item.classList.toggle("selected", selectedBucketIds.indexOf(id) !== -1);
    }

    if (selectedBucketIds.length > 0) {
        updateStatus(`${selectedBucketIds.length} bucket${selectedBucketIds.length > 1 ? "s" : ""} selected — Ctrl+Enter to inject`, "active");
        chrome.storage.local.set({ lastBucketIds: selectedBucketIds.map(String) });
    } else {
        updateStatus("Select buckets", "");
    }
    updateBucketLabel();
    updateTreeLines();
}

function updateTreeLines() {
    const list = document.getElementById("cs-bucket-list");
    if (!list) return;

    const items = Array.from(list.querySelectorAll(".cs-bucket-item"));
    items.forEach((item) => item.classList.remove("in-range"));

    const selectedIndices = [];
    items.forEach((item, i) => {
        if (item.classList.contains("selected")) selectedIndices.push(i);
    });

    if (selectedIndices.length === 0) return;

    const first = selectedIndices[0];
    const last = selectedIndices[selectedIndices.length - 1];

    for (let i = first; i <= last; i++) {
        items[i].classList.add("in-range");
    }
}

async function deleteBucket(id, name) {
    const item = document.querySelector(`.cs-bucket-item[data-id="${id}"]`);
    if (item) item.classList.add("deleting");
    updateStatus("Deleting...", "");
    try {
        const res = await fetch(`${API_URL}/bucket/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            if (item) item.classList.remove("deleting");
            updateStatus(data.error || "Failed to delete", "error");
            return;
        }
        const idx = selectedBucketIds.indexOf(id);
        if (idx !== -1) selectedBucketIds.splice(idx, 1);
        updateStatus(`"${name}" deleted`, "active");
        updateBucketLabel();
        await loadBuckets();
        updateTreeLines();
    } catch (err) {
        if (item) item.classList.remove("deleting");
        updateStatus("Backend offline", "error");
    }
}

async function loadBuckets() {
    const list = document.getElementById("cs-bucket-list");
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/buckets`);
        const buckets = await res.json();

        if (buckets.length === 0) {
            list.innerHTML = '<div class="cs-bucket-empty">No buckets yet</div>';
            return;
        }

        list.innerHTML = "";
        buckets.forEach((b) => {
            const item = document.createElement("label");
            item.className = "cs-bucket-item";
            item.dataset.id = String(b.id);
            item.innerHTML = `
                <svg class="cs-bucket-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span class="cs-bucket-name">${b.name}</span>
                <button class="cs-bucket-delete" title="Delete bucket">&times;</button>
            `;
            item.addEventListener("click", (e) => {
                if (e.target.closest(".cs-bucket-delete")) return;
                e.preventDefault();
                e.stopPropagation();
                toggleBucket(String(b.id));
            });
            const deleteBtn = item.querySelector(".cs-bucket-delete");
            deleteBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (deleteBtn.classList.contains("confirm")) {
                    deleteBucket(String(b.id), b.name);
                } else {
                    deleteBtn.classList.add("confirm");
                    deleteBtn.innerHTML = "&#10003;";
                    deleteBtn.title = "Click again to confirm";
                    setTimeout(() => {
                        deleteBtn.classList.remove("confirm");
                        deleteBtn.innerHTML = "&times;";
                        deleteBtn.title = "Delete bucket";
                    }, 2000);
                }
            });
            list.appendChild(item);
        });

        chrome.storage.local.get("lastBucketIds", (data) => {
            let saved = data.lastBucketIds;
            if (!saved) {
                chrome.storage.local.get("lastBucketId", (oldData) => {
                    if (oldData.lastBucketId) {
                        toggleBucket(String(oldData.lastBucketId));
                    } else if (buckets.length > 0) {
                        toggleBucket(String(buckets[0].id));
                    }
                });
            } else {
                saved.forEach((id) => {
                    const exists = buckets.some((b) => String(b.id) === String(id));
                    if (exists) {
                        toggleBucket(String(id));
                    }
                });
                if (selectedBucketIds.length === 0 && buckets.length > 0) {
                    toggleBucket(String(buckets[0].id));
                }
            }
        });
    } catch (err) {
        list.innerHTML = '<div class="cs-bucket-empty">Backend offline</div>';
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
    if (selectedBucketIds.length === 0) {
        updateStatus("Select at least one bucket", "error");
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
                bucket_ids: selectedBucketIds.map((id) => parseInt(id)),
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
        updateStatus(`Injected ${data.chunks.length} chunks — sending...`, "active");

        await new Promise(resolve => setTimeout(resolve, 500));

        let sendButton = document.querySelector('button[data-testid="send-button"]') ||
            document.querySelector('button[aria-label="Send prompt"]') ||
            document.querySelector('button[aria-label="Send"]');

        if (!sendButton) {
            const formButtons = document.querySelectorAll('form button');
            for (const btn of formButtons) {
                if (btn.querySelector('svg') && !btn.disabled) {
                    sendButton = btn;
                    break;
                }
            }
        }

        if (sendButton && !sendButton.disabled) {
            sendButton.click();
        } else {
            input.focus();
            input.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, cancelable: true
            }));
            input.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, cancelable: true
            }));
            input.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, cancelable: true
            }));
        }

        updateStatus(`Injected ${data.chunks.length} chunks — sent!`, "active");
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
