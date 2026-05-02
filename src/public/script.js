const socket = io();
const checkboxContainer = document.querySelector(".checkbox-container");
const checkbox_count = 500;

socket.on("server:checkbox:change", (data) => {
  const checkbox = document.getElementById(data.id);
  if (checkbox) {
    checkbox.checked = data.checked;
  }
});

window.addEventListener("load", async () => {
  const response = await fetch("checkboxes", { method: "GET" });
  const data = await response.json();
  if (data && data.checkboxes) {
    data.checkboxes.forEach((checkboxData, i) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `checkbox-${i + 1}`;
      checkbox.checked = checkboxData;
      checkbox.className =
        "w-6 h-6 cursor-pointer rounded border-2 border-gray-600 bg-gray-800 appearance-none checked:bg-indigo-500 checked:border-indigo-400 hover:border-indigo-400 transition-all duration-150 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-0 focus:ring-offset-gray-900";

      checkbox.addEventListener("change", (event) => {
        const isChecked = event.target.checked;
        socket.emit("client:checkbox:change", {
          id: checkbox.id,
          checked: isChecked,
        });
      });
      checkboxContainer.appendChild(checkbox);
    });
  }
});
