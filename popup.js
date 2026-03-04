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
// update brightness of all elements on page
async function applyColorExposureToTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    return;
  }

  const rOff = parseFloat(rSlider.value) / 100;
  const gOff = parseFloat(gSlider.value) / 100;
  const bOff = parseFloat(bSlider.value) / 100;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [rOff, gOff, bOff],
    func: (rOff, gOff, bOff) => {
      
      // Image adjustment using a smarter matrix to isolate dominant colors
      const media = document.querySelectorAll('img, video, canvas');
      media.forEach(m => {
        // We use a matrix where the target channel is boosted, but we subtract 
        // a portion of other channels to prevent the "washing out" of neutral colors.
        m.style.filter = `url('data:image/svg+xml,\
          <svg xmlns="http://www.w3.org/2000/svg">\
            <filter id="f" color-interpolation-filters="sRGB">\
              <feColorMatrix type="matrix" values="\
                ${1 + rOff} 0 0 0 0 \
                0 ${1 + gOff} 0 0 0 \
                0 0 ${1 + bOff} 0 0 \
                0 0 0 1 0" />\
              <feComponentTransfer>\
                <feFuncR type="linear" slope="${1 + rOff}" />\
                <feFuncG type="linear" slope="${1 + gOff}" />\
                <feFuncB type="linear" slope="${1 + bOff}" />\
              </feComponentTransfer>\
            </filter>\
          </svg>#f')`;
      });

      // 2. background & text typeshi
      const elements = document.querySelectorAll('div, p, span, section, header, footer, b, i, a, li, h1, h2, h3');
      elements.forEach(el => {
        const props = ['backgroundColor', 'color'];
        props.forEach(prop => {
          let orig = el.getAttribute(`data-orig-${prop}`);
          if (!orig) {
            orig = window.getComputedStyle(el)[prop];
            if (orig === 'rgba(0, 0, 0, 0)' || orig === 'transparent') return;
            el.setAttribute(`data-orig-${prop}`, orig);
          }

          const rgb = orig.match(/\d+/g);
          if (!rgb || rgb.length < 3) return;

          let r = parseInt(rgb[0]);
          let g = parseInt(rgb[1]);
          let b = parseInt(rgb[2]);

          const isWhite = r > 220 && g > 220 && b > 220;
          const isGray = Math.abs(r - g) < 15 && Math.abs(r - b) < 15;
          if (isWhite && isGray) return;

          let offset = 0;
          // bucket logic for DOM elements
          if (r > g && r > b) offset = rOff;
          else if (g > r && g >= b) offset = gOff;
          else if (b > r && b > g) offset = bOff;

          const newR = Math.min(255, Math.max(0, r + (offset * 255)));
          const newG = Math.min(255, Math.max(0, g + (offset * 255)));
          const newB = Math.min(255, Math.max(0, b + (offset * 255)));

          el.style[prop] = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
        });
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

// update display numbers instantly while dragging
const handleSliderMove = () => {
  updateLabels();
};

// save data and inject script ONLY when the slider is released
const handleSliderRelease = () => {
  chrome.storage.local.set({
    red: rSlider.value,
    green: gSlider.value,
    blue: bSlider.value
  });
  // color change that tab
  applyColorExposureToTab();
};

// fire continuously while moving
rSlider.addEventListener('input', handleSliderMove);
gSlider.addEventListener('input', handleSliderMove);
bSlider.addEventListener('input', handleSliderMove);

// fire once when letting go
rSlider.addEventListener('change', handleSliderRelease);
gSlider.addEventListener('change', handleSliderRelease);
bSlider.addEventListener('change', handleSliderRelease);
// save settings
settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
};

// initialize
loadSavedData();
updateSSliderValue();
sSlider.addEventListener('input', updateSSliderValue);
