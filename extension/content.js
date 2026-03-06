// Content script - extracts page text, title, and URL
// This runs on every page and responds to messages from popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContent") {
        const content = {
            url: window.location.href,
            title: document.title,
            text: document.body.innerText,
        };
        sendResponse(content);
    }
    return true;
});
