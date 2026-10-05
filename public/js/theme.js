(() => {
  const key = "indonav-theme";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  let storageError = null;

  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") preference = saved;
  } catch (error) {
    console.error("Could not read theme preference:", error);
    storageError = "Theme preference storage is unavailable. Your choice will only apply to this visit.";
  }

  function applyTheme() {
    const theme = preference || (system.matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta.content = theme === "dark" ? "#101918" : "#ffffff";
    const button = document.getElementById("themeToggle");
    if (button) {
      const label = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  }

  function showStorageError(message) {
    const toast = document.createElement("div");
    toast.className = "toast toast-error";
    toast.setAttribute("role", "alert");
    const text = document.createElement("span");
    text.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "Dismiss";
    close.addEventListener("click", () => toast.remove());
    toast.append(text, close);
    document.getElementById("toastRegion").append(toast);
  }

  // Set the theme before styles load to avoid a flash on returning visits.
  applyTheme();
  system.addEventListener("change", () => {
    if (!preference) applyTheme();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = event.newValue === "light" || event.newValue === "dark" ? event.newValue : null;
    applyTheme();
  });
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme();
    if (storageError) showStorageError(storageError);
    document.getElementById("themeToggle").addEventListener("click", () => {
      preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme();
      try {
        localStorage.setItem(key, preference);
      } catch (error) {
        console.error("Could not save theme preference:", error);
        showStorageError("Theme changed, but could not be saved. It will reset when you leave this page.");
      }
    });
  });
})();
