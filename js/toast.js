let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = "info", duration = 5000) {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  getContainer().appendChild(el);

  setTimeout(() => {
    el.classList.add("toast--exit");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, duration);
}
