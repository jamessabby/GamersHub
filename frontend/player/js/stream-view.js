(() => {
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const streamId = new URLSearchParams(window.location.search).get("streamId");

  if (streamId) {
    document.title = `GamersHub - Stream View ${streamId}`;
  }

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });
})();
