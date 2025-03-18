document.addEventListener('DOMContentLoaded', init, false);
function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('./sw.js', import.meta.url))
      .then((reg) => {
        
      }, (err) => {
        console.error('Service worker not registered -->', err);
      });
  }
}