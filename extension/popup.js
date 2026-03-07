const API_URL = "http://localhost:3000";

const bucketSelect = document.getElementById("bucketSelect");
const bucketDropdown = document.getElementById("bucketDropdown");
const bucketDropdownBtn = document.getElementById("bucketDropdownBtn");
const bucketDropdownLabel = document.getElementById("bucketDropdownLabel");
const bucketDropdownMenu = document.getElementById("bucketDropdownMenu");
const newBucketName = document.getElementById("newBucketName");
const createBucketBtn = document.getElementById("createBucketBtn");
const bucketStatus = document.getElementById("bucketStatus");
const loadContextBtn = document.getElementById("loadContextBtn");
const contextStatus = document.getElementById("contextStatus");
const priorityButtons = document.querySelectorAll(".btn-priority");
let dropdownOpen = false;

function closeBucketDropdown() {
  dropdownOpen = false;
  bucketDropdownBtn.classList.remove("open");
  bucketDropdownMenu.classList.remove("open");
}

function setBucketSelection(bucketId) {
  bucketSelect.value = bucketId ? String(bucketId) : "";

  const selectedOption = Array.from(bucketSelect.options).find(
    (opt) => String(opt.value) === String(bucketSelect.value),
  );

  bucketDropdownLabel.textContent = selectedOption
    ? selectedOption.textContent
    : "Select bucket";

  const items = bucketDropdownMenu.querySelectorAll(".bucket-dropdown-item");
  items.forEach((item) => {
    item.classList.toggle(
      "active",
      String(item.dataset.value) === String(bucketSelect.value),
    );
  });

  closeBucketDropdown();
}

function renderBucketMenu(buckets) {
  bucketDropdownMenu.innerHTML = "";

  if (buckets.length === 0) {
    const emptyItem = document.createElement("button");
    emptyItem.type = "button";
    emptyItem.className = "bucket-dropdown-item disabled";
    emptyItem.textContent = "No buckets yet";
    emptyItem.disabled = true;
    bucketDropdownMenu.appendChild(emptyItem);
    bucketDropdownLabel.textContent = "No buckets yet";
    return;
  }

  buckets.forEach((b) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "bucket-dropdown-item";
    item.dataset.value = String(b.id);
    item.textContent = b.name;
    item.addEventListener("click", () => setBucketSelection(String(b.id)));
    bucketDropdownMenu.appendChild(item);
  });
}

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = `status show ${type}`;
}

priorityButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    priorityButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

bucketDropdownBtn.addEventListener("click", () => {
  if (bucketDropdownMenu.querySelector(".bucket-dropdown-item.disabled")) {
    return;
  }

  dropdownOpen = !dropdownOpen;
  bucketDropdownBtn.classList.toggle("open", dropdownOpen);
  bucketDropdownMenu.classList.toggle("open", dropdownOpen);
});

document.addEventListener("click", (event) => {
  if (!bucketDropdown.contains(event.target)) {
    closeBucketDropdown();
  }
});

async function loadBuckets() {
  try {
    const res = await fetch(`${API_URL}/buckets`);
    const buckets = await res.json();

    bucketSelect.innerHTML = "";

    if (buckets.length === 0) {
      bucketSelect.innerHTML = '<option value="">No buckets yet</option>';
      renderBucketMenu([]);
      return;
    }

    buckets.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      bucketSelect.appendChild(opt);
    });

    renderBucketMenu(buckets);
    setBucketSelection(String(buckets[0].id));
  } catch (err) {
    bucketSelect.innerHTML = '<option value="">Backend offline</option>';
    bucketDropdownMenu.innerHTML =
      '<button type="button" class="bucket-dropdown-item disabled" disabled>Backend offline</button>';
    bucketDropdownLabel.textContent = "Backend offline";
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
    setBucketSelection(String(data.id));

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
  showStatus(contextStatus, " Extracting page content...", "loading");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const content = await chrome.tabs.sendMessage(tab.id, {
      action: "getPageContent",
    });

    if (!content || !content.text) {
      showStatus(contextStatus, "Could not extract page content", "error");
      loadContextBtn.disabled = false;
      return;
    }

    const severity = document.querySelector(".btn-priority.active").dataset
      .severity;
    showStatus(
      contextStatus,
      ` Sending ${content.text.length} chars to backend (${severity} severity)...`,
      "loading",
    );

    const res = await fetch(`${API_URL}/context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: content.url,
        title: content.title,
        text: content.text,
        bucket_id: parseInt(bucketId),
        severity: severity,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(contextStatus, data.error, "error");
    } else {
      showStatus(
        contextStatus,
        `Saved! ${data.chunks_count} chunks stored (${severity})`,
        "success",
      );
      chrome.storage.local.set({ lastBucketId: bucketId });
    }
  } catch (err) {
    showStatus(contextStatus, "Failed: " + err.message, "error");
  }

  loadContextBtn.disabled = false;
});

loadBuckets();
