const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const playButtons = Array.from(document.querySelectorAll('.play-btn'));

    playButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const gameName = btn.dataset.game;
            if (gameName) {
                // Send message to main process to open the game window
                ipcRenderer.send('game:open', gameName);
            }
        });
    });
});

