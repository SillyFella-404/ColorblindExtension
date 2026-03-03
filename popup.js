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

// update brightness of all elements on page by looping thru them and using the stored values
// but now we're injecting it into the webpage
async function applyColorExposureToTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    return;
  }

  const rExp = parseFloat(rSlider.value) || 0;
  const gExp = parseFloat(gSlider.value) || 0;
  const bExp = parseFloat(bSlider.value) || 0;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [rExp, gExp, bExp],
    func: (rExp, gExp, bExp) => {
      
      // adjust colors for images/videos by singling them out
      const media = document.querySelectorAll('img, video, canvas');
      media.forEach(m => {
        m.style.filter = `url('data:image/svg+xml,\
          <svg xmlns="http://www.w3.org/2000/svg">\
            <filter id="f" color-interpolation-filters="sRGB">\
              <feColorMatrix type="matrix" values="\
                ${rExp} 0 0 0 0 \
                0 ${gExp} 0 0 0 \
                0 0 ${bExp} 0 0 \
                0 0 0 1 0" />\
            </filter>\
          </svg>#f')`;
      });

      // text & bg colors
      const elements = document.querySelectorAll('div, p, span, section, header, footer, b, i, a, li, h1, h2, h3');
      
      elements.forEach(el => {
        let originalRGB = el.getAttribute('data-orig-color');
        if (!originalRGB) {
          originalRGB = window.getComputedStyle(el).backgroundColor;
          if (originalRGB === 'rgba(0, 0, 0, 0)' || originalRGB === 'transparent') return;
          el.setAttribute('data-orig-color', originalRGB);
        }

        const rgb = originalRGB.match(/\d+/g);
        if (!rgb || rgb.length < 3) return;

        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);

        //no whites or grays
        const isWhite = r > 220 && g > 220 && b > 220;
        const isGray = Math.abs(r - g) < 10 && Math.abs(r - b) < 10;
        if (isWhite && isGray) return;

        let factor = 0;
        // make sure they are greater not juts equal
        if (r > g && r > b) factor = rExp / 100;
        else if (g > r && g >= b) factor = gExp / 100;
        else if (b > r && b > g) factor = bExp / 100;

        const newR = Math.min(255, Math.max(0, r * (1 + factor)));
        const newG = Math.min(255, Math.max(0, g * (1 + factor)));
        const newB = Math.min(255, Math.max(0, b * (1 + factor)));

        el.style.backgroundColor = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
      });
    }
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
  // color change that tab
  applyColorExposureToTab();
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
