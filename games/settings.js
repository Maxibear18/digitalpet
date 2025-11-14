const { ipcRenderer } = require('electron');

const resetBtn = document.getElementById('resetBtn');
const gainMoneyBtn = document.getElementById('gainMoneyBtn');
const darkModeBtn = document.getElementById('darkModeBtn');

resetBtn.addEventListener('click', () => {
    // Send reset request to main process
    // Main process will show confirmation dialog
    ipcRenderer.send('settings:resetGame');
});

gainMoneyBtn.addEventListener('click', () => {
    // Send money gain request to main process
    ipcRenderer.send('settings:gainMoney', 250);
});

darkModeBtn.addEventListener('click', () => {
    // Placeholder for dark mode - does nothing for now
    console.log('Dark mode button clicked (not implemented yet)');
});

