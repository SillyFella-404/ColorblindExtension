// popup.js

// 1. Select your elements
const settingsCheckbox = document.querySelector('#view-settings input[type="checkbox"]');
const rSlider = document.getElementById('r-slider');
const gSlider = document.getElementById('g-slider');
const bSlider = document.getElementById('b-slider');

// 2. LOAD function: Runs immediately when popup opens
function loadSavedData() {
  chrome.storage.local.get(['notifications', 'red', 'green', 'blue'], (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    if (data.red) rSlider.value = data.red;
    if (data.green) gSlider.value = data.green;
    if (data.blue) bSlider.value = data.blue;
    
    // Optional: Update the UI color preview if you have one
    updatePreview(data.red, data.green, data.blue);
  });
}

// 3. SAVE functions: Triggered by user input
settingsCheckbox.addEventListener('change', () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
});

// Helper for sliders
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
