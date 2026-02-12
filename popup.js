// view containers
const views = {
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  colors: document.getElementById('view-colors')
};

// helper to switch views using classes instead of inline styles
function showView(viewKey) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[viewKey].classList.add('active');
}

// navigation
document.getElementById('btn-settings').onclick = () => showView('settings');
document.getElementById('btn-colors').onclick = () => showView('colors');

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.onclick = () => showView('main');
});

// elements
const settingsCheckbox = document.getElementById('notify-toggle');
const rSlider = document.getElementById('r-slider');
const gSlider = document.getElementById('g-slider');
const bSlider = document.getElementById('b-slider');

// value display elements
const rVal = document.getElementById('r-val');
const gVal = document.getElementById('g-val');
const bVal = document.getElementById('b-val');

// update text labels to match slider values
function updateLabels() {
  rVal.textContent = rSlider.value;
  gVal.textContent = gSlider.value;
  bVal.textContent = bSlider.value;
}

// load saved data
function loadSavedData() {
  chrome.storage.local.get(['notifications', 'red', 'green', 'blue'], (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    if (data.red) rSlider.value = data.red;
    if (data.green) gSlider.value = data.green;
    if (data.blue) bSlider.value = data.blue;
    updateLabels(); // sync labels after loading
  });
}

// save data and update display
const handleSliderInput = () => {
  updateLabels();
  chrome.storage.local.set({
    red: rSlider.value,
    green: gSlider.value,
    blue: bSlider.value
  });
};

rSlider.oninput = handleSliderInput;
gSlider.oninput = handleSliderInput;
bSlider.oninput = handleSliderInput;

// save settings
settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
};

// initialize
loadSavedData();
