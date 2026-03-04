// view management
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

// stolen accordion logic
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
setupAccordion('header-img-correction', 'section-img-correction', 'arrow-img-correction');
setupAccordion('header-other', 'section-other', 'arrow-other');

// them elements
const uiSliders = {
  r: document.getElementById('r-slider'),
  g: document.getElementById('g-slider'),
  b: document.getElementById('b-slider'),
  rVal: document.getElementById('r-val'),
  gVal: document.getElementById('g-val'),
  bVal: document.getElementById('b-val')
};

const imgSliders = {
  r: document.getElementById('img-r-slider'),
  g: document.getElementById('img-g-slider'),
  b: document.getElementById('img-b-slider'),
  rVal: document.getElementById('img-r-val'),
  gVal: document.getElementById('img-g-val'),
  bVal: document.getElementById('img-b-val')
};

const settingsCheckbox = document.getElementById('notify-toggle');

// this function is injected into the active tab to update colors *dynamically* 
function injectStyles(data) {
  let styleTag = document.getElementById('ext-color-styles');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'ext-color-styles';
    document.head.appendChild(styleTag);
  }

  // exposure for ui (backgrounds, text, buttons)
  const uiBright = 1 + (data.red / 100);
  const uiCont = 1 + (data.green / 100);
  const uiSat = 1 + (data.blue / 100);

  // color correction for images (REF THIS SHIT RIGGED)
  const imgHue = data.imgRed || 0;
  const imgBright = 1 + (data.imgGreen / 100);
  const imgCont = 1 + (data.imgBlue / 100);

  styleTag.innerHTML = `
    html {
      filter: brightness(${uiBright}) contrast(${uiCont}) saturate(${uiSat}) !important;
    }
    /* prevent images from getting the global ui filter applied twice */
    img, video, canvas {
      filter: hue-rotate(${imgHue}deg) brightness(${imgBright}) contrast(${imgCont}) !important;
    }
  `;
}

// helper to trigger the injection on the current tab
async function updateTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.storage.local.get(null, (data) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectStyles,
      args: [data]
    });
  });
}

// storages & labels
function updateLabels() {
  uiSliders.rVal.textContent = uiSliders.r.value;
  uiSliders.gVal.textContent = uiSliders.g.value;
  uiSliders.bVal.textContent = uiSliders.b.value;

  imgSliders.rVal.textContent = imgSliders.r.value;
  imgSliders.gVal.textContent = imgSliders.g.value;
  imgSliders.bVal.textContent = imgSliders.b.value;
}

const handleInput = () => {
  updateLabels();
  const data = {
    red: uiSliders.r.value,
    green: uiSliders.g.value,
    blue: uiSliders.b.value,
    imgRed: imgSliders.r.value,
    imgGreen: imgSliders.g.value,
    imgBlue: imgSliders.b.value
  };
  chrome.storage.local.set(data, updateTab);
};

// IDF drone listeners
[uiSliders.r, uiSliders.g, uiSliders.b, imgSliders.r, imgSliders.g, imgSliders.b].forEach(s => {
  s.oninput = handleInput;
});

settingsCheckbox.onchange = () => {
  chrome.storage.local.set({ notifications: settingsCheckbox.checked });
};

// initialize
chrome.storage.local.get(null, (data) => {
  if (data.notifications !== undefined) settingsCheckbox.checked = data.notifications;
  uiSliders.r.value = data.red ?? 0;
  uiSliders.g.value = data.green ?? 0;
  uiSliders.b.value = data.blue ?? 0;
  imgSliders.r.value = data.imgRed ?? 0;
  imgSliders.g.value = data.imgGreen ?? 0;
  imgSliders.b.value = data.imgBlue ?? 0;
  updateLabels();
});
