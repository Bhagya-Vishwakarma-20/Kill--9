// Minimal background service worker (required for MV3)
chrome.runtime.onInstalled.addListener(() => {
    console.log("Context Stack extension installed");
});
