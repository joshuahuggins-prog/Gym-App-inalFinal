// Minimal CRA-style service worker registration

export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then(() => {
          console.log("Service Worker registered");
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  }
}
