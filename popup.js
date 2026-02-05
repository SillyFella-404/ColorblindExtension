// popup.js
const mainMenu = document.getElementById('main-menu');
const accountMenu = document.getElementById('account-menu');

document.getElementById('go-to-account').addEventListener('click', () => {
  mainMenu.style.display = 'none';
  accountMenu.style.display = 'block';
});

document.getElementById('back-from-account').addEventListener('click', () => {
  accountMenu.style.display = 'none';
  mainMenu.style.display = 'block';
});
