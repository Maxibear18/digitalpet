const { ipcRenderer } = require('electron');

let purchasedGames = { slotMachine: false, solver: false, shooter: false, snake: false };

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
    purchasedGames = games || { slotMachine: false, solver: false, shooter: false, snake: false };
    updateGameVisibility();
});

// Listen for individual game unlock
ipcRenderer.on('game:unlocked', (_event, gameId) => {
    if (gameId === 'slotMachine') {
        purchasedGames.slotMachine = true;
        updateGameVisibility();
    } else if (gameId === 'solver') {
        purchasedGames.solver = true;
        updateGameVisibility();
    } else if (gameId === 'shooter') {
        purchasedGames.shooter = true;
        updateGameVisibility();
    } else if (gameId === 'snake') {
        purchasedGames.snake = true;
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
    
    // Show/hide solver game based on purchase status
    const solverCard = document.querySelector('[data-game="solver"]')?.closest('.game-card');
    if (solverCard) {
        if (purchasedGames.solver) {
            solverCard.style.display = ''; // Show if purchased
        } else {
            solverCard.style.display = 'none'; // Hide if not purchased
        }
    }
    
    // Show/hide shooter game based on purchase status
    const shooterCard = document.querySelector('[data-game="shooter"]')?.closest('.game-card');
    if (shooterCard) {
        if (purchasedGames.shooter) {
            shooterCard.style.display = ''; // Show if purchased
        } else {
            shooterCard.style.display = 'none'; // Hide if not purchased
        }
    }
    
    // Show/hide snake game based on purchase status
    const snakeCard = document.querySelector('[data-game="snake"]')?.closest('.game-card');
    if (snakeCard) {
        if (purchasedGames.snake) {
            snakeCard.style.display = ''; // Show if purchased
        } else {
            snakeCard.style.display = 'none'; // Hide if not purchased
        }
    }
}

