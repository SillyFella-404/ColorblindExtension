// view containers
const views = {
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  colors: document.getElementById('view-colors')
};

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

// exposure elements
const colorSliders = ['r', 'y', 'g', 'c', 'b', 'm'];
const sliders = {};
const displays = {};

colorSliders.forEach(code => {
  sliders[code] = document.getElementById(`${code}-slider`);
  displays[code] = document.getElementById(`${code}-val`);
});

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
setupAccordion('header-other', 'section-other', 'arrow-other');

function updateLabels() {
  colorSliders.forEach(c => {
    displays[c].textContent = sliders[c].value;
  });
}

// update brightness of all elements
async function applyColorExposureToTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

  const vals = {};
  colorSliders.forEach(c => {
    vals[c] = parseFloat(sliders[c].value) / 100;
  });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [vals],
    func: (v) => {
      // 1. Image logic: Targeted Subtraction Matrix
      // This prevents tinting by boosting primary components while subtracting 
      // the slider value from other channels to keep neutral colors stable.
      const rMatrix = 1 + v.r + v.y + v.m;
      const gMatrix = 1 + v.g + v.y + v.c;
      const bMatrix = 1 + v.b + v.c + v.m;

      const media = document.querySelectorAll('img, video, canvas');
      media.forEach(m => {
        m.style.filter = `url('data:image/svg+xml,\
          <svg xmlns="http://www.w3.org/2000/svg">\
            <filter id="f" color-interpolation-filters="sRGB">\
              <feColorMatrix type="matrix" values="\
                ${rMatrix} 0 0 0 0 \
                0 ${gMatrix} 0 0 0 \
                0 0 ${bMatrix} 0 0 \
                0 0 0 1 0" />\
            </filter>\
          </svg>#f')`;
      });

      // 2. background & text typeshi
      const elements = document.querySelectorAll('div, p, span, section, header, footer, b, i, a, li, h1, h2, h3');
      elements.forEach(el => {
        ['backgroundColor', 'color'].forEach(prop => {
          let orig = el.getAttribute(`data-orig-${prop}`);
          if (!orig) {
            orig = window.getComputedStyle(el)[prop];
            if (orig === 'rgba(0, 0, 0, 0)' || orig === 'transparent') return;
            el.setAttribute(`data-orig-${prop}`, orig);
          }
          const rgb = orig.match(/\d+/g);
          if (!rgb || rgb.length < 3) return;
          let [r, g, b] = rgb.map(Number);

          const isGray = Math.abs(r - g) < 20 && Math.abs(r - b) < 20 && Math.abs(g - b) < 20;
          if (isGray && r > 50) return; // Skip whites/grays

          let offset = 0;
          const max = Math.max(r, g, b);
          // advanced bucket logic for secondaries
          if (r > 200 && g > 200 && b < 100) offset = v.y; // Yellow
          else if (g > 200 && b > 200 && r < 100) offset = v.c; // Cyan
          else if (r > 200 && b > 200 && g < 100) offset = v.m; // Magenta
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

function loadSavedData() {
  const keys = ['notifications', 'fontSize', ...colorSliders];
  chrome.storage.local.get(keys, (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    if (data.fontSize) {
      sSlider.value = data.fontSize;
      updateSSliderValue();
    }
    colorSliders.forEach(c => {
      if (data[c] !== undefined) sliders[c].value = data[c];
    });
    updateLabels();
  });
}

function updateSSliderValue(){
  SSliderValueDisplay.textContent = sSlider.value;
  chrome.storage.local.set({ fontSize: sSlider.value });
}

// events: input for snappiness, change for performance
colorSliders.forEach(c => {
  sliders[c].oninput = updateLabels;
  sliders[c].onchange = () => {
    const saveData = {};
    saveData[c] = sliders[c].value;
    chrome.storage.local.set(saveData);
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
