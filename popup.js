// view containers
const views = {
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  colors: document.getElementById('view-colors')
};

// helper to switch views
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
const sSlider = document.getElementById('s-slider');
const SSliderValueDisplay = document.getElementById('sliderValue');

// exposure sliders (Original + New)
const rSlider = document.getElementById('r-slider');
const ySlider = document.getElementById('y-slider');
const gSlider = document.getElementById('g-slider');
const cSlider = document.getElementById('c-slider');
const bSlider = document.getElementById('b-slider');
const mSlider = document.getElementById('m-slider');

const rVal = document.getElementById('r-val');
const yVal = document.getElementById('y-val');
const gVal = document.getElementById('g-val');
const cVal = document.getElementById('c-val');
const bVal = document.getElementById('b-val');
const mVal = document.getElementById('m-val');

//gets the slider element by using its ID.
var redSlider = document.getElementById('r-slider');
var yellowSlider = document.getElementById('y-slider');
var greenSlider = document.getElementById('g-slider');
var cyanSlider = document.getElementById('c-slider');
var blueSlider = document.getElementById('b-slider');
var magentaSlider = document.getElementById('m-slider');

// accordion logic 
function setupAccordion(headerId, contentId, arrowId) {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);
  const arrow = document.getElementById(arrowId);

  header.onclick = () => {
    const isHidden = content.classList.contains('hidden');
    content.classList.toggle('hidden');
    arrow.textContent = isHidden ? 'v' : '>';
  };
}

setupAccordion('header-exposure', 'section-exposure', 'arrow-exposure');
setupAccordion('header-presets', 'section-presets', 'arrow-presets');
setupAccordion('header-other', 'section-other', 'arrow-other');

// update text labels
function updateLabels() {
  rVal.textContent = rSlider.value;
  yVal.textContent = ySlider.value;
  gVal.textContent = gSlider.value;
  cVal.textContent = cSlider.value;
  bVal.textContent = bSlider.value;
  mVal.textContent = mSlider.value;
}

//changes the slider values to become a selected preset
function applyPreset(selectedValue) {
  const allSliders = [redSlider, yellowSlider, greenSlider, cyanSlider, blueSlider, magentaSlider];
  allSliders.forEach(s => s.value = 0);
  
  if (selectedValue == "Protanomly") {
    redSlider.value = 80;
    greenSlider.value = 40;
  }
  else if (selectedValue == "Protanopia") {
    redSlider.value = 80;
    yellowSlider.value = 40;
  }
  else if (selectedValue == "Deuteranomly") {
    greenSlider.value = 80;
    redSlider.value = 40;
  }
  else if (selectedValue == "Deuteranopia") {
    greenSlider.value = 80;
    redSlider.value = 30;
  }
  else if (selectedValue == "Tritanomly") {
    blueSlider.value = 75;
    greenSlider.value = 25;
    yellowSlider.value = 60;
    redSlider.value = 40;
  }
  else if (selectedValue == "Tritanopia") {
    blueSlider.value = 80;
    greenSlider.value = 20;
    magentaSlider.value = 80;
    redSlider.value = 20;
  }

  chrome.storage.local.set({
    red: redSlider.value,
    yellow: yellowSlider.value,
    green: greenSlider.value,
    cyan: cyanSlider.value,
    blue: blueSlider.value,
    magenta: magentaSlider.value
  });
  
  updateLabels();
  applyColorExposureToTab();
}

// apply colors to tab
async function applyColorExposureToTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

  const offsets = {
    r: parseFloat(rSlider.value) / 100,
    y: parseFloat(ySlider.value) / 100,
    g: parseFloat(gSlider.value) / 100,
    c: parseFloat(cSlider.value) / 100,
    b: parseFloat(bSlider.value) / 100,
    m: parseFloat(mSlider.value) / 100
  };

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [offsets],
    func: (o) => {
      
      // 1. IMAGE ADJUSTMENT (Fixed Matrix)
      // Yellow affects R and G. Cyan affects G and B. Magenta affects R and B.
      const rM = 1 + o.r + (o.y * 0.5) + (o.m * 0.5);
      const gM = 1 + o.g + (o.y * 0.5) + (o.c * 0.5);
      const bM = 1 + o.b + (o.c * 0.5) + (o.m * 0.5);

      const media = document.querySelectorAll('img, video, canvas');
      media.forEach(m => {
        m.style.filter = `url('data:image/svg+xml,\
          <svg xmlns="http://www.w3.org/2000/svg">\
            <filter id="f" color-interpolation-filters="sRGB">\
              <feColorMatrix type="matrix" values="\
                ${rM} 0 0 0 0 \
                0 ${gM} 0 0 0 \
                0 0 ${bM} 0 0 \
                0 0 0 1 0" />\
            </filter>\
          </svg>#f')`;
      });

      // 2. DOM ELEMENT ADJUSTMENT
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

          const isNeutral = Math.abs(r - g) < 20 && Math.abs(r - b) < 20;
          if (isNeutral && r > 200) return; // skip whites/grays

          let offset = 0;
          const max = Math.max(r, g, b);

          // Bucket logic for Primary and Secondary colors
          if (r > 180 && g > 180 && b < 120) offset = o.y;      // Yellow
          else if (g > 180 && b > 180 && r < 120) offset = o.c; // Cyan
          else if (r > 180 && b > 180 && g < 120) offset = o.m; // Magenta
          else if (r === max) offset = o.r;
          else if (g === max) offset = o.g;
          else if (b === max) offset = o.b;

          const newR = Math.min(255, Math.max(0, r + (offset * 255)));
          const newG = Math.min(255, Math.max(0, g + (offset * 255)));
          const newB = Math.min(255, Math.max(0, b + (offset * 255)));

          el.style[prop] = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
        });
      });
    }
  });
}

function loadSavedData() {
  chrome.storage.local.get(['notifications', 'red', 'yellow', 'green', 'cyan', 'blue', 'magenta', 'fontSize'], (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    rSlider.value = data.red || 0;
    ySlider.value = data.yellow || 0;
    gSlider.value = data.green || 0;
    cSlider.value = data.cyan || 0;
    bSlider.value = data.blue || 0;
    mSlider.value = data.magenta || 0;
    if (data.fontSize) {
      sSlider.value = data.fontSize;
      updateSSliderValue();      
    }
    updateLabels();
  });
}

function updateSSliderValue(){
  SSliderValueDisplay.textContent = sSlider.value;
  chrome.storage.local.set({ fontSize: sSlider.value });
}

// Single function to handle all slider events
const handleSliderInput = () => {
  updateLabels();
  chrome.storage.local.set({
    red: rSlider.value,
    yellow: ySlider.value,
    green: gSlider.value,
    cyan: cSlider.value,
    blue: bSlider.value,
    magenta: mSlider.value
  });
};

// Listeners
[rSlider, ySlider, gSlider, cSlider, bSlider, mSlider].forEach(slider => {
  slider.oninput = handleSliderInput;
  slider.onchange = applyColorExposureToTab; // Only inject script when done moving
});

settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
};

sSlider.oninput = updateSSliderValue;

// initialize
loadSavedData();
updateSSliderValue();
