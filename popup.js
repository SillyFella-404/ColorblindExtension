// popup.js

// View containers
const views = {
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  colors: document.getElementById('view-colors')
};

// Helper to switch views
function showView(viewKey) {
  // Hide all views
  Object.values(views).forEach(v => v.style.display = 'none');
  // Show the requested one
  views[viewKey].style.display = 'block';
}

// Event Listeners for Navigation
document.getElementById('btn-settings').onclick = () => showView('settings');
document.getElementById('btn-colors').onclick = () => showView('colors');

// Handle all "Back" buttons
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.onclick = () => showView('main');
});
