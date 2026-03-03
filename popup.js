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
const sSlider = document.getElementById('s-slider');
const SSliderValueDisplay = document.getElementById('sliderValue');

const rVal = document.getElementById('r-val');
const gVal = document.getElementById('g-val');
const bVal = document.getElementById('b-val');

// accordion logic using simple characters for arrows
function setupAccordion(headerId, contentId, arrowId) {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);
  const arrow = document.getElementById(arrowId);

  //sick and awesome and totally original arrow rotating mechanism that I didn't copy and paste from geeksforgeeks.com
  header.onclick = () => {
    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden');
    // toggle between v for down and > for right
    arrow.textContent = isHidden ? 'v' : '>';
  };
}

setupAccordion('header-exposure', 'section-exposure', 'arrow-exposure');
setupAccordion('header-other', 'section-other', 'arrow-other');

// update text labels to match slider values
function updateLabels() {
  rVal.textContent = rSlider.value;
  gVal.textContent = gSlider.value;
  bVal.textContent = bSlider.value;
}

//update brightness of all elements on page by looping thru them and using the stored values
function applyColorExposure() {
  const elements = document.querySelectorAll('*');
  
  // get current slider values as multipliers (e.g., if slider is 0-100, normalize it)
  const rExp = parseFloat(rSlider.value) || 0;
  const gExp = parseFloat(gSlider.value) || 0;
  const bExp = parseFloat(bSlider.value) || 0;

  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    const bgColor = style.backgroundColor;

    // BENJAMIN NETENYAHUUUU (regex) RETURN MY RGB VALUES NOW
    const rgb = bgColor.match(/\d+/g);
    if (!rgb || rgb.length < 3) return;

    const r = parseInt(rgb[0]);
    const g = parseInt(rgb[1]);
    const b = parseInt(rgb[2]);

    let exposureValue = 1; // default (100% brightness)

    // check which color is most dominant
    if (r >= g && r >= b) {
      // closest to red
      exposureValue = 1 + (rExp / 100);
    } else if (g >= r && g >= b) {
      // closest to green
      exposureValue = 1 + (gExp / 100);
    } else if (b >= r && b >= g) {
      // closest to blue
      exposureValue = 1 + (bExp / 100);
    }

    // change tha brightness
    el.style.filter = `brightness(${exposureValue})`;
  });
}

// load saved data
function loadSavedData() {
  chrome.storage.local.get(['notifications', 'red', 'green', 'blue', 'fontSize'], (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    rSlider.value = data.red !== undefined ? data.red : 0;
    gSlider.value = data.green !== undefined ? data.green : 0;
    bSlider.value = data.blue !== undefined ? data.blue : 0;
    updateLabels(); // sync labels after loading
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
updateSSliderValue();
sSlider.addEventListener('input', updateSSliderValue);
