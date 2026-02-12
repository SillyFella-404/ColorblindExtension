// popup.js

// View containers
const views = {
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  colors: document.getElementById('view-colors')
};

// Helper to switch views using classes instead of inline styles
function showView(viewKey) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[viewKey].classList.add('active');
}

// Navigation
document.getElementById('btn-settings').onclick = () => showView('settings');
document.getElementById('btn-colors').onclick = () => showView('colors');

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.onclick = () => showView('main');
});

// Elements
const settingsCheckbox = document.getElementById('notify-toggle');
const rSlider = document.getElementById('r-slider');
const gSlider = document.getElementById('g-slider');
const bSlider = document.getElementById('b-slider');
const sSlider = document.getElementById('s-slider');
const SSliderValueDisplay = document.getElementById('sliderValue');

// Load Data
function loadSavedData() {
  chrome.storage.local.get(['notifications', 'red', 'green', 'blue', 'fontSize'], (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    if (data.red) rSlider.value = data.red;
    if (data.green) gSlider.value = data.green;
    if (data.blue) bSlider.value = data.blue;
    if (data.fontSize) {
      sSlider.value = data.fontSize;
      updateSSliderValue();      
    }
  });
}
function updateSSliderValue(){
  SSliderValueDisplay.textContent = sSlider.value;
  chrome.storage.local.set({ fontSize: sSlider.value });
}

// Save Data
settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });

};

const saveColors = () => {
  chrome.storage.local.set({
    red: rSlider.value,
    green: gSlider.value,
    blue: bSlider.value
  });
};

rSlider.oninput = saveColors;
gSlider.oninput = saveColors;
bSlider.oninput = saveColors;

// Initialize
loadSavedData();
updateSSliderValue();
sSlider.addEventListener('input', updateSSliderValue);
