// function to be injected into pages on load
const injectColorFix = (o) => {
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
      if (isNeutral && r > 200) return; 

      let offset = 0;
      const max = Math.max(r, g, b);

      if (r > 200 && g > 80 && g < 170 && b < 100) offset = o.o;      
      else if (r > 180 && g > 180 && b < 120) offset = o.y;            
      else if (r > 100 && b > 150 && g < 130) offset = o.p;            
      else if (r === max) offset = o.r;
      else if (g === max) offset = o.g;
      else if (b === max) offset = o.b;

      const newR = Math.min(255, Math.max(0, r + (offset * 128)));
      const newG = Math.min(255, Math.max(0, g + (offset * 128)));
      const newB = Math.min(255, Math.max(0, b + (offset * 128)));

      el.style[prop] = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
    });
  });
};

// Listen for tab updates to automatically apply colors
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.storage.local.get(['red', 'orange', 'yellow', 'green', 'blue', 'purple'], (data) => {
      
      const offsets = {
        r: parseFloat(data.red || 0) / 100,
        o: parseFloat(data.orange || 0) / 100,
        y: parseFloat(data.yellow || 0) / 100,
        g: parseFloat(data.green || 0) / 100,
        b: parseFloat(data.blue || 0) / 100,
        p: parseFloat(data.purple || 0) / 100
      };

      // Only inject if there's actually a modification to make
      if (offsets.r === 0 && offsets.o === 0 && offsets.y === 0 && offsets.g === 0 && offsets.b === 0 && offsets.p === 0) {
        return; 
      }

      chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [offsets],
        func: injectColorFix
      }).catch(err => console.error("Error applying colors to tab:", err));
    });
  }
});
