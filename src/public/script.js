const socket = io();
const checkboxContainer = document.getElementById("checkbox-container");
const checkboxGrid = document.getElementById("checkbox-grid");
const loadingIndicator = document.getElementById("loading-indicator");
const checkedCountEl = document.getElementById("checked-count");
const progressEl = document.getElementById("progress");

const checkbox_count = 1000000;
const batch_size = 500;
const render_ahead = 2000;

let allCheckboxStates = new Array(checkbox_count).fill(false);
const pendingClicks = new Map();
let totalChecked = 0;
let lastRenderedIndex = 0;
let isLoading = false;
let loadedFromServer = false;

function formatNumber(num) {
  return num.toLocaleString();
}

function updateStats() {
  totalChecked = allCheckboxStates.filter(Boolean).length;
  checkedCountEl.textContent = formatNumber(totalChecked);
  const percentage = ((totalChecked / checkbox_count) * 100).toFixed(4);
  progressEl.textContent = percentage + "%";
}

function createCheckbox(globalIndex) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `checkbox-${globalIndex + 1}`;
  checkbox.checked = allCheckboxStates[globalIndex];
  checkbox.className =
    "w-4 h-4 cursor-pointer rounded border border-gray-600 bg-gray-800 appearance-none checked:bg-indigo-500 checked:border-indigo-400 hover:border-indigo-400 transition-all duration-150 focus:ring-1 focus:ring-indigo-500/50";

  checkbox.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    allCheckboxStates[globalIndex] = isChecked;
    pendingClicks.set(checkbox.id, isChecked);
    socket.emit("client:checkbox:change", {
      id: checkbox.id,
      checked: isChecked,
    });
    updateStats();
  });

  return checkbox;
}

function renderMoreCheckboxes() {
  if (lastRenderedIndex >= checkbox_count) {
    loadingIndicator.style.display = "none";
    return;
  }

  isLoading = true;
  const fragment = document.createDocumentFragment();
  const endIndex = Math.min(lastRenderedIndex + batch_size, checkbox_count);

  for (let i = lastRenderedIndex; i < endIndex; i++) {
    const checkbox = createCheckbox(i);
    fragment.appendChild(checkbox);
  }

  checkboxContainer.appendChild(fragment);
  lastRenderedIndex = endIndex;
  isLoading = false;

  if (lastRenderedIndex >= checkbox_count) {
    loadingIndicator.style.display = "none";
  }
}

function renderInitialCheckboxes() {
  for (let i = 0; i < render_ahead; i++) {
    const checkbox = createCheckbox(i);
    checkboxContainer.appendChild(checkbox);
  }
  lastRenderedIndex = render_ahead;
}

checkboxGrid.addEventListener("scroll", () => {
  if (isLoading || lastRenderedIndex >= checkbox_count) return;

  const scrollBottom =
    checkboxGrid.scrollHeight - checkboxGrid.scrollTop - checkboxGrid.clientHeight;

  if (scrollBottom < 500) {
    renderMoreCheckboxes();
  }
});

socket.on("server:checkbox:change", (data) => {
  pendingClicks.delete(data.id);
  const index = parseInt(data.id.replace("checkbox-", "")) - 1;
  allCheckboxStates[index] = data.checked;

  const checkbox = document.getElementById(data.id);
  if (checkbox) {
    checkbox.checked = data.checked;
  }
  updateStats();
});

socket.on("rate-limited", (data) => {
  pendingClicks.forEach((isChecked, id) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = !isChecked;
      const index = parseInt(id.replace("checkbox-", "")) - 1;
      allCheckboxStates[index] = !isChecked;
    }
  });
  pendingClicks.clear();
  updateStats();
});

window.addEventListener("load", async () => {
  const response = await fetch("checkboxes", { method: "GET" });
  const data = await response.json();
  if (data && data.checkboxes) {
    allCheckboxStates = data.checkboxes;
    loadedFromServer = true;
    updateStats();
    renderInitialCheckboxes();
  }
});
