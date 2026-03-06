

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContent") {
        sendResponse({
            url: window.location.href,
            title: document.title,
            text: document.body.innerText,
        });
        return;
    }
    if (request.action === "showNotification") {
        showToast(request.message);
        return;
    }
});


document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        showToast("Saving context...");
        chrome.runtime.sendMessage({
            action: "loadContextFromPage",
            content: {
                url: window.location.href,
                title: document.title,
                text: document.body.innerText,
            },
        });
    }
});

// Toast notification
function showToast(message) {
    let toast = document.getElementById("cs-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "cs-toast";
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: #2f2f2f;
            color: #ececec;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 13px;
            z-index: 999999;
            border: 1px solid #4e4e4e;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = "0";
    }, 3000);
}
