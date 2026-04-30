// view containers
const views = {
  main: document.getElementById('view-main'),
  settings: document.getElementById('view-settings'),
  colors: document.getElementById('view-colors')
};

// Helper to switch views
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

// settings elements
const settingsCheckbox = document.getElementById('notify-toggle');
const sSlider = document.getElementById('s-slider');
const SSliderValueDisplay = document.getElementById('sliderValue');

// who up sliding they colors rn
const rSlider = document.getElementById('r-slider');
const oSlider = document.getElementById('o-slider');
const ySlider = document.getElementById('y-slider');
const gSlider = document.getElementById('g-slider');
const bSlider = document.getElementById('b-slider');
const pSlider = document.getElementById('p-slider');

const rVal = document.getElementById('r-val');
const oVal = document.getElementById('o-val');
const yVal = document.getElementById('y-val');
const gVal = document.getElementById('g-val');
const bVal = document.getElementById('b-val');
const pVal = document.getElementById('p-val');

const allColorSliders = [rSlider, oSlider, ySlider, gSlider, bSlider, pSlider];

// preset controls
const presetSelect = document.getElementById('presets');
const btnSaveCustom = document.getElementById('btn-save-custom');
const btnClearCustom = document.getElementById('btn-clear-custom');
const btnReset = document.getElementById('btn-reset');

const presetValues = {
  'Protanomaly':  { r: 50, o: 0, y: 0, g: -20, b: 0, p: 0 },
  'Protanopia':   { r: 50, o: 0, y: 0, g: -20, b: 0, p: 0 },
  'Deuteranomly': { r: -20, o: 0, y: 0, g: 50, b: 0, p: 0 },
  'Deuteranopia': { r: -20, o: 0, y: 0, g: 50, b: 0, p: 0 },
  'Tritanomly':   { r: 0, o: 0, y: -20, g: 0, b: 50, p: 0 },
  'Tritanopia':   { r: 0, o: 0, y: -20, g: 0, b: 50, p: 0 }
};

// stolen accordians (like the instrument)
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

// update slider value texts when slider gets moved
function updateLabels() {
  rVal.textContent = rSlider.value;
  oVal.textContent = oSlider.value;
  yVal.textContent = ySlider.value;
  gVal.textContent = gSlider.value;
  bVal.textContent = bSlider.value;
  pVal.textContent = pSlider.value;
}

// apply colors (script is injected into webapage)
async function applyColorExposureToTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

  const offsets = {
    r: parseFloat(rSlider.value) / 100,
    o: parseFloat(oSlider.value) / 100,
    y: parseFloat(ySlider.value) / 100,
    g: parseFloat(gSlider.value) / 100,
    b: parseFloat(bSlider.value) / 100,
    p: parseFloat(pSlider.value) / 100
  };

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [offsets],
    func: (o) => {
      
      // Image adjustment courtery of the incomprehensible svg matrix
      // DO NOT TOUCH EVERYTIME I TRY IT BREAKS AGAIN
      // Orange is high R, partial G. Purple is high B, partial R.
      const rM = 1 + o.r + (o.o * 0.6) + (o.p * 0.4);
      const gM = 1 + o.g + (o.y * 0.5) + (o.o * 0.3);
      const bM = 1 + o.b + (o.p * 0.7);

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

      // adjust elements
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
          if (isNeutral && r > 200) return; // skip whites/light grays (we don't like them)

          let offset = 0;
          const max = Math.max(r, g, b);

          // bigger bucket for 6 colors
          if (r > 200 && g > 80 && g < 170 && b < 100) offset = o.o;      // organge
          else if (r > 180 && g > 180 && b < 120) offset = o.y;            // yeller
          else if (r > 100 && b > 150 && g < 130) offset = o.p;            // nurple
          else if (r === max) offset = o.r;
          else if (g === max) offset = o.g;
          else if (b === max) offset = o.b;

          const newR = Math.min(255, Math.max(0, r + (offset * 128)));
          const newG = Math.min(255, Math.max(0, g + (offset * 128)));
          const newB = Math.min(255, Math.max(0, b + (offset * 128)));

          el.style[prop] = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
        });
      });
    }
  });
}

function loadSavedData() {
  chrome.storage.local.get(['notifications', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'fontSize', 'selectedPreset'], (data) => {
    if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
    
    rSlider.value = data.red || 0;
    oSlider.value = data.orange || 0;
    ySlider.value = data.yellow || 0;
    gSlider.value = data.green || 0;
    bSlider.value = data.blue || 0;
    pSlider.value = data.purple || 0;

    if (data.selectedPreset) {
      presetSelect.value = data.selectedPreset;
    }

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

// Sets UI sliders, applies to tab, and saves to storage
function applySliders(vals) {
  rSlider.value = vals.r || 0;
  oSlider.value = vals.o || 0;
  ySlider.value = vals.y || 0;
  gSlider.value = vals.g || 0;
  bSlider.value = vals.b || 0;
  pSlider.value = vals.p || 0;
  
  handleSliderInput();
  applyColorExposureToTab();
}

// slider input
const handleSliderInput = () => {
  updateLabels();
  chrome.storage.local.set({
    red: rSlider.value,
    orange: oSlider.value,
    yellow: ySlider.value,
    green: gSlider.value,
    blue: bSlider.value,
    purple: pSlider.value,
    selectedPreset: presetSelect.value
  });
};

// listeners for slider input ns tuff
allColorSliders.forEach(slider => {
  slider.oninput = () => {
    presetSelect.value = 'none'; // Clear preset if user manually tweaks
    handleSliderInput();
  };
  slider.onchange = applyColorExposureToTab; 
});

// listeners for presets & resets
presetSelect.onchange = () => {
  const val = presetSelect.value;
  
  if (val === 'none') return;

  if (val === 'custom') {
    chrome.storage.local.get(['customPreset'], (data) => {
      if (data.customPreset) {
        applySliders(data.customPreset);
      } else {
        alert('No custom preset saved yet.');
        presetSelect.value = 'none';
        handleSliderInput();
      }
    });
    return;
  }

  if (presetValues[val]) {
    applySliders(presetValues[val]);
  }
};

btnSaveCustom.onclick = () => {
  const customPreset = {
    r: rSlider.value,
    o: oSlider.value,
    y: ySlider.value,
    g: gSlider.value,
    b: bSlider.value,
    p: pSlider.value
  };
  chrome.storage.local.set({ customPreset }, () => {
    presetSelect.value = 'custom';
    handleSliderInput();
    alert('Custom preset saved successfully!');
  });
};

btnClearCustom.onclick = () => {
  chrome.storage.local.remove('customPreset', () => {
    if (presetSelect.value === 'custom') {
      presetSelect.value = 'none';
      handleSliderInput();
    }
    alert('Custom preset cleared.');
  });
};

btnReset.onclick = () => {
  presetSelect.value = 'none';
  applySliders({ r: 0, o: 0, y: 0, g: 0, b: 0, p: 0 });
};

settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
};

sSlider.oninput = updateSSliderValue;

// initialize
loadSavedData();
updateSSliderValue();
