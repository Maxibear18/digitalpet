const { ipcRenderer } = require('electron');

let playerMoney = 0;
let currentBet = 10;
let isSpinning = false;

// Symbol definitions - food icons only
const SYMBOLS = {
    cherry: { emoji: '🍒', name: 'Cherries' },
    riceball: { emoji: '🍙', name: 'Riceball' },
    sandwich: { emoji: '🥪', name: 'Sandwiches' },
    meat: { emoji: '🍖', name: 'Meat' },
    cake: { emoji: '🎂', name: 'Cake' }
};

const TWO_MATCH_MULTIPLIERS = {
    cherry: 1.1,
    riceball: 1.2,
    sandwich: 1.3,
    meat: 1.5,
    cake: 1.7
};

const THREE_MATCH_MULTIPLIERS = {
    cherry: 1.3,
    riceball: 1.5,
    sandwich: 1.7,
    meat: 2.0,
    cake: 2.5
};

const symbolKeys = Object.keys(SYMBOLS);

const betAmountInput = document.getElementById('betAmount');
const betDisplay = document.getElementById('betDisplay');
const playerMoneyDisplay = document.getElementById('playerMoney');
const spinBtn = document.getElementById('spinBtn');
const resultMessage = document.getElementById('resultMessage');
const reel1 = document.getElementById('reel1');
const reel2 = document.getElementById('reel2');
const reel3 = document.getElementById('reel3');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
let spinCount = 0;

// Listen for money updates
ipcRenderer.on('money:update', (_event, amount) => {
    playerMoney = amount;
    updateDisplay();
});

// Request current money
ipcRenderer.send('money:request');

// Listen for money response
ipcRenderer.on('money:response', (_event, amount) => {
    playerMoney = amount;
    updateDisplay();
});

// Update bet amount
betAmountInput.addEventListener('input', () => {
    const value = parseInt(betAmountInput.value) || 0;
    currentBet = Math.max(0, Math.min(100, value));
    betAmountInput.value = currentBet;
    betDisplay.textContent = `$${currentBet}`;
    spinBtn.textContent = `Spin ($${currentBet})`;
    updateDisplay();
});

// Spin button
spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    if (currentBet < 0 || currentBet > 100) {
        alert('Bet must be between $0 and $100!');
        return;
    }
    if (currentBet > playerMoney) {
        alert(`Not enough money! You have $${playerMoney} but want to bet $${currentBet}.`);
        return;
    }
    spin();
});

// Spin function
function spin() {
    if (isSpinning) return;
    
    // Deduct bet
    playerMoney -= currentBet;
    updateMoney();
    updateDisplay();
    
    const currentSpinNumber = ++spinCount;
    const applyStatEffects = currentSpinNumber % 3 === 0;
    
    isSpinning = true;
    spinBtn.disabled = true;
    resultMessage.textContent = 'Spinning...';
    resultMessage.className = 'result-message';
    
    // Start spinning animation
    reel1.classList.add('spinning');
    reel2.classList.add('spinning');
    reel3.classList.add('spinning');
    
    // Generate random results
    const result1 = symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
    const result2 = symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
    const result3 = symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
    
    // Stop reels at different times for visual effect
    setTimeout(() => {
        stopReel(reel1, result1);
    }, 1000 + Math.random() * 500);
    
    setTimeout(() => {
        stopReel(reel2, result2);
    }, 1500 + Math.random() * 500);
    
    setTimeout(() => {
        stopReel(reel3, result3);
        checkWin(result1, result2, result3, applyStatEffects);
    }, 2000 + Math.random() * 500);
}

function stopReel(reel, symbol) {
    reel.classList.remove('spinning');
    
    // Set the middle item to the result
    const items = reel.querySelectorAll('.reel-item');
    const middleIndex = Math.floor(items.length / 2);
    
    // Update all items to show variety, but ensure middle shows result
    items.forEach((item, index) => {
        if (index === middleIndex) {
            item.textContent = SYMBOLS[symbol].emoji;
            item.dataset.icon = symbol;
        } else {
            // Random symbols for other positions
            const randomSymbol = symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
            item.textContent = SYMBOLS[randomSymbol].emoji;
            item.dataset.icon = randomSymbol;
        }
    });
}

function checkWin(symbol1, symbol2, symbol3, applyStatEffects = false) {
    isSpinning = false;
    spinBtn.disabled = false;
    
    let winnings = 0;
    let message = '';
    
    const threeMatches = symbol1 === symbol2 && symbol2 === symbol3;
    let matchedSymbol = null;
    let matchCount = 0;
    
    if (threeMatches) {
        matchedSymbol = symbol1;
        matchCount = 3;
    } else if (symbol1 === symbol2) {
        matchedSymbol = symbol1;
        matchCount = 2;
    } else if (symbol2 === symbol3) {
        matchedSymbol = symbol2;
        matchCount = 2;
    } else if (symbol1 === symbol3) {
        matchedSymbol = symbol1;
        matchCount = 2;
    }
    
    if (matchedSymbol && SYMBOLS[matchedSymbol]) {
        const multipliers = matchCount === 3 ? THREE_MATCH_MULTIPLIERS : TWO_MATCH_MULTIPLIERS;
        const multiplier = multipliers[matchedSymbol] || 0;
        winnings = Math.floor(currentBet * multiplier);
        if (winnings > 0) {
            const symbolName = SYMBOLS[matchedSymbol].name;
            if (matchCount === 3) {
                message = `Triple ${symbolName}! You win $${winnings} (x${multiplier.toFixed(1)})!`;
            } else {
                message = `Double ${symbolName}! You win $${winnings} (x${multiplier.toFixed(1)})!`;
            }
        }
    } else {
        winnings = 0;
        message = `No middle-row match. You lost $${currentBet}.`;
    }
    
    // Add winnings
    if (winnings > 0) {
        playerMoney += winnings;
        updateMoney();
        resultMessage.textContent = message;
        resultMessage.className = 'result-message win';
        ipcRenderer.send('game:petHappy');
    } else {
        resultMessage.textContent = message;
        resultMessage.className = 'result-message lose';
    }
    
    updateDisplay();
    
    if (applyStatEffects) {
        ipcRenderer.send('game:reward', {
            happiness: 5,
            experience: 5,
            hunger: -5,
            rest: -5
        });
    }
}

function updateMoney() {
    ipcRenderer.send('money:update', playerMoney);
}

function updateDisplay() {
    playerMoneyDisplay.textContent = `$${playerMoney}`;
    betAmountInput.max = Math.min(100, playerMoney);
    
    if (currentBet > playerMoney) {
        currentBet = Math.min(currentBet, playerMoney);
        betAmountInput.value = currentBet;
        betDisplay.textContent = `$${currentBet}`;
        spinBtn.textContent = `Spin ($${currentBet})`;
    }
    
    spinBtn.disabled = isSpinning || currentBet <= 0 || currentBet > playerMoney;
}

// Help modal
helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.style.display = 'none';
});

helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.style.display = 'none';
    }
});

// Initialize display
updateDisplay();

