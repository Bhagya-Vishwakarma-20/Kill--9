chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "PROMPT_SENT") {
    console.log("Prompt captured:", message.prompt);
    
    sendResponse({ status: "ok" });
  }

});