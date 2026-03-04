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

// navigation logic - restored buttons
document.getElementById('btn-settings').onclick = () => showView('settings');
document.getElementById('btn-colors').onclick = () => showView('colors');

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.onclick = () => showView('main');
});

// settings elements
const settingsCheckbox = document.getElementById('notify-toggle');
const sSlider = document.getElementById('s-slider');
const SSliderValueDisplay = document.getElementById('sliderValue');

// exposure slider setup
const colorKeys = ['r', 'y', 'g', 'c', 'b', 'm'];
const sliders = {};
const displays = {};

colorKeys.forEach(key => {
  sliders[key] = document.getElementById(`${key}-slider`);
  displays[key] = document.getElementById(`${key}-val`);
});

// accordion logic using simple characters for arrows
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
setupAccordion('header-other', 'section-other', 'arrow-other');

// update text labels to match slider values
function updateLabels() {
  colorKeys.forEach(key => {
    if (sliders[key] && displays[key]) {
      displays[key].textContent = sliders[key].value;
    }
  });
}

// update brightness of all elements on page
async function applyColorExposureToTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    return;
  }

  // gather all slider values into an object to pass to the script
  const vals = {};
  colorKeys.forEach(key => {
    vals[key] = parseFloat(sliders[key].value) / 100;
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [vals],
    func: (v) => {
      
      // 1. Image Logic: Targeted Matrix Subtraction (Color Cube Style)
      // We calculate how much to boost each primary channel based on primary and secondary sliders
      const rMod = 1 + v.r + (v.y * 0.5) + (v.m * 0.5);
      const gMod = 1 + v.g + (v.y * 0.5) + (v.c * 0.5);
      const bMod = 1 + v.b + (v.c * 0.5) + (v.m * 0.5);

      const media = document.querySelectorAll('img, video, canvas');
      media.forEach(m => {
        m.style.filter = `url('data:image/svg+xml,\
          <svg xmlns="http://www.w3.org/2000/svg">\
            <filter id="f" color-interpolation-filters="sRGB">\
              <feColorMatrix type="matrix" values="\
                ${rMod} 0 0 0 0 \
                0 ${gMod} 0 0 0 \
                0 0 ${bMod} 0 0 \
                0 0 0 1 0" />\
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

          let [r, g, b] = rgb.map(Number);

          // skip whites and grays to avoid washing out the page
          const isWhite = r > 220 && g > 220 && b > 220;
          const isGray = Math.abs(r - g) < 20 && Math.abs(r - b) < 20;
          if (isWhite || isGray) return;

          let offset = 0;
          const max = Math.max(r, g, b);
          
          // bucket logic including secondary colors
          if (r > 200 && g > 200 && b < 150) offset = v.y; // Yellow-ish
          else if (g > 200 && b > 200 && r < 150) offset = v.c; // Cyan-ish
          else if (r > 200 && b > 200 && g < 150) offset = v.m; // Magenta-ish
          else if (r === max) offset = v.r;
          else if (g === max) offset = v.g;
          else if (b === max) offset = v.b;

          const newR = Math.min(255, Math.max(0, r + (offset * 255)));
          const newG = Math.min(255, Math.max(0, g + (offset * 255)));
          const newB = Math.min(255, Math.max(0, b + (offset * 255)));

          el.style[prop] = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
        });
      });
    }
  });
}

// load saved data from storage
function loadSavedData() {
  const keys = ['notifications', 'fontSize', ...colorKeys.map(k => `${k}-val`) ];
  chrome.storage.local.get(keys, (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    if (data.fontSize) {
      sSlider.value = data.fontSize;
      updateSSliderValue();
    }
    colorKeys.forEach(key => {
      const savedVal = data[`${key}-val`];
      if (savedVal !== undefined) sliders[key].value = savedVal;
    });
    updateLabels();
  });
}

function updateSSliderValue(){
  SSliderValueDisplay.textContent = sSlider.value;
  chrome.storage.local.set({ fontSize: sSlider.value });
}

// events
colorKeys.forEach(key => {
  // update label instantly for smoothness
  sliders[key].oninput = updateLabels;
  
  // apply changes only when user lets go
  sliders[key].onchange = () => {
    const storageObj = {};
    storageObj[`${key}-val`] = sliders[key].value;
    chrome.storage.local.set(storageObj);
    applyColorExposureToTab();
  };
});

settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
};

sSlider.addEventListener('input', updateSSliderValue);

// initialize
loadSavedData();
updateSSliderValue();
