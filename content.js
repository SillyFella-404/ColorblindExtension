chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'APPLY_TEXTURES') {
    applyTextureToColor('red', request.data['red-texture']);
  }
});
