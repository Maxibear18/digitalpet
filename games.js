const { ipcRenderer } = require('electron');

let purchasedGames = { slotMachine: false };

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
    
    // Update game visibility based on purchases
    updateGameVisibility();
    
    // Request purchased games state
    ipcRenderer.send('games:requestPurchased');
});

// Listen for purchased games updates
ipcRenderer.on('games:purchased', (_event, games) => {
    purchasedGames = games || { slotMachine: false };
    updateGameVisibility();
});

// Listen for individual game unlock
ipcRenderer.on('game:unlocked', (_event, gameId) => {
    if (gameId === 'slotMachine') {
        purchasedGames.slotMachine = true;
        updateGameVisibility();
    }
});

function updateGameVisibility() {
    // Show/hide slot machine game based on purchase status
    const slotMachineCard = document.querySelector('[data-game="slot-machine"]')?.closest('.game-card');
    if (slotMachineCard) {
        if (purchasedGames.slotMachine) {
            slotMachineCard.style.display = ''; // Show if purchased
        } else {
            slotMachineCard.style.display = 'none'; // Hide if not purchased
        }
    }
}

