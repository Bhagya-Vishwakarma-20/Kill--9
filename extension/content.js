function getPromptInput() {
  return document.querySelector('#prompt-textarea');
}

function getPromptText() {
  const input = getPromptInput();
  if (!input) return "";

  const paragraphs = input.querySelectorAll('p');
  
  if (paragraphs.length > 0) {
    return Array.from(paragraphs)
      .map(p => p.innerText)
      .join('\n')
      .trim();
  }

  return input.innerText.trim();
}

document.addEventListener("keydown", (event) => {

  if (event.key === "Enter" && !event.shiftKey) {

    const prompt = getPromptText();

    if (!prompt) return;

    chrome.runtime.sendMessage({
      type: "PROMPT_SENT",
      prompt: prompt
    });

  }

});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "POPUP_CLICKED") {

    const prompt = getPromptText();

    if (!prompt) return;

    alert("Current prompt: " + prompt);

  }

});