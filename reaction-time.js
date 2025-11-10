const { ipcRenderer } = require('electron');

// Game state
const TARGET_TIME = 10.00; // Target time in seconds
let startTime = null;
let stopTime = null;
let timerInterval = null;
let currentTime = 0;
let isWaiting = false;
let isRunning = false;
let hasStopped = false;

// DOM elements
const timerDisplay = document.getElementById('timerDisplay');
const yourTimeEl = document.getElementById('yourTime');
const statusMessageEl = document.getElementById('statusMessage');
const instructionTextEl = document.getElementById('instructionText');
const startBtn = document.getElementById('startBtn');
const resultsEl = document.getElementById('results');
const resultTitleEl = document.getElementById('resultTitle');
const resultTimeEl = document.getElementById('resultTime');
const resultDifferenceEl = document.getElementById('resultDifference');
const resultMoneyEl = document.getElementById('resultMoney');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const petSpriteEl = document.getElementById('petSprite');
const petBubbleEl = document.querySelector('.pet-bubble');

// Pet animation state
let petHappinessSpriteIndex = 0;
let petHappinessInterval = null;
let isPetCheering = false;

// Listen for pet type update
ipcRenderer.on('game:petType', (_event, petType, evolutionStage) => {
    // Update pet sprite based on type and evolution stage
    const PET_TYPES = {
        botamon: {
            walk: ['sprites/botamon/botamon.png', 'sprites/botamon/botamon 2.png'],
            happiness: ['sprites/botamon/botamon.png', 'sprites/botamon/botamon 3.png'],
            sleep: 'sprites/botamon/botamon 4.png',
            canEvolve: true,
            evolution: 'koromon'
        },
        poyomon: {
            walk: ['sprites/poyomon/poyomon.png', 'sprites/poyomon/poyomon 2.png'],
            happiness: ['sprites/poyomon/poyomon.png', 'sprites/poyomon/poyomon 3.png'],
            sleep: 'sprites/poyomon/poyomon 4.png',
            canEvolve: false
        },
        punimon: {
            walk: ['sprites/punimon/punimon.png', 'sprites/punimon/punimon 2.png'],
            happiness: ['sprites/punimon/punimon.png', 'sprites/punimon/punimon 3.png'],
            sleep: 'sprites/punimon/punimon 4.png',
            canEvolve: false
        },
        pitchmon: {
            walk: ['sprites/pitchmon/pitchmon.png', 'sprites/pitchmon/pitchmon 2.png'],
            happiness: ['sprites/pitchmon/pitchmon.png', 'sprites/pitchmon/pitchmon 3.png'],
            sleep: 'sprites/pitchmon/pitchmon 4.png',
            canEvolve: false
        },
        koromon: {
            walk: ['sprites/koromon/koromon.png', 'sprites/koromon/koromon 2.png'],
            happiness: ['sprites/koromon/koromon.png', 'sprites/koromon/koromon 3.png'],
            sleep: 'sprites/koromon/koromon 4.png',
            canEvolve: false
        }
    };
    
    function getCurrentPetData() {
        if (evolutionStage === 2 && PET_TYPES[petType] && PET_TYPES[petType].canEvolve) {
            const evolutionType = PET_TYPES[petType].evolution;
            return PET_TYPES[evolutionType];
        }
        return PET_TYPES[petType] || PET_TYPES.botamon;
    }
    
    const petData = getCurrentPetData();
    if (petSpriteEl && petData) {
        petSpriteEl.src = petData.walk[0]; // Use first walk sprite
        // Store happiness sprites for cheering animation
        petSpriteEl.dataset.happinessSprites = JSON.stringify(petData.happiness);
    }
});

// Initialize game
function initGame() {
    currentTime = 0;
    startTime = null;
    stopTime = null;
    isWaiting = false;
    isRunning = false;
    hasStopped = false;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    timerDisplay.textContent = '0.00';
    timerDisplay.className = 'timer-display waiting';
    yourTimeEl.textContent = '--';
    statusMessageEl.textContent = 'Press SPACEBAR when the timer reaches 10 seconds!';
    instructionTextEl.textContent = 'Press SPACEBAR to start the timer, then press it again at exactly 10 seconds!';
    resultsEl.style.display = 'none';
    startBtn.disabled = false;
}

// Start game
function startGame() {
    initGame();
    isWaiting = true;
    startBtn.disabled = true;
    statusMessageEl.textContent = 'Press SPACEBAR to start the timer...';
    instructionTextEl.textContent = 'Press SPACEBAR now to begin!';
    timerDisplay.className = 'timer-display waiting';
    timerDisplay.textContent = '0.00';
}

// Start timer
function startTimer() {
    if (!isWaiting) return;
    
    isWaiting = false;
    isRunning = true;
    startTime = Date.now();
    currentTime = 0;
    
    timerDisplay.className = 'timer-display running';
    statusMessageEl.textContent = 'Timer running... Press SPACEBAR at exactly 10 seconds!';
    instructionTextEl.textContent = 'Watch the timer and press SPACEBAR when it hits 10.00!';
    
    timerInterval = setInterval(() => {
        currentTime = (Date.now() - startTime) / 1000;
        timerDisplay.textContent = currentTime.toFixed(2);
    }, 10); // Update every 10ms for smooth display
}

// Stop timer
function stopTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    stopTime = Date.now();
    const elapsedTime = (stopTime - startTime) / 1000;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    hasStopped = true;
    timerDisplay.className = 'timer-display stopped';
    timerDisplay.textContent = elapsedTime.toFixed(2);
    
    // Calculate difference from target
    const difference = Math.abs(elapsedTime - TARGET_TIME);
    const isOver = elapsedTime > TARGET_TIME; // Check if over 10 seconds
    
    // Calculate money reward based on accuracy
    let moneyReward = 0;
    let resultMessage = '';
    
    if (difference === 0) {
        // Exactly 10.00 seconds
        moneyReward = 55;
        resultMessage = 'Perfect! Exactly 10.00 seconds!';
    } else if (difference <= 0.1) {
        // 0.1 seconds off
        moneyReward = 30;
        resultMessage = 'Excellent! Very close!';
    } else if (difference <= 0.2) {
        // 0.2 seconds off
        moneyReward = 30;
        resultMessage = 'Great timing!';
    } else if (difference <= 0.3) {
        // 0.3 seconds off
        moneyReward = 25;
        resultMessage = 'Good job!';
    } else if (difference <= 0.5) {
        // 0.5 seconds off
        moneyReward = 20;
        resultMessage = 'Nice try!';
    } else if (difference <= 0.7) {
        // 0.7 seconds off
        moneyReward = 15;
        resultMessage = 'Close enough!';
    } else if (difference <= 1.0) {
        // 1.0 second off
        moneyReward = 10;
        resultMessage = 'Not bad!';
    } else {
        // More than 1 second off
        moneyReward = 0;
        resultMessage = 'Too far off!';
    }
    
    // Halve reward if over 10 seconds
    if (isOver && moneyReward > 0) {
        moneyReward = Math.floor(moneyReward / 2);
    }
    
    // Show results
    yourTimeEl.textContent = elapsedTime.toFixed(2) + 's';
    resultTitleEl.textContent = resultMessage;
    resultTimeEl.textContent = elapsedTime.toFixed(2);
    resultDifferenceEl.textContent = difference.toFixed(2);
    resultMoneyEl.textContent = moneyReward;
    resultsEl.style.display = 'block';
    
    statusMessageEl.textContent = resultMessage;
    instructionTextEl.textContent = 'Click "Start Game" to play again!';
    
    // Send rewards: money based on accuracy, always: -5 sleep, -5 hunger, +5 exp, +5 happiness
    ipcRenderer.send('game:reward', {
        money: moneyReward,
        happiness: 5,
        experience: 5,
        hunger: -5,
        rest: -5
    });
    
    // Trigger pet happiness animation if they got any reward (within acceptable parameters)
    if (moneyReward > 0) {
        ipcRenderer.send('game:petHappy');
        makePetCheer();
    }
    
    startBtn.disabled = false;
}

// Handle keyboard input
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (isWaiting) {
            // Start the timer
            startTimer();
        } else if (isRunning) {
            // Stop the timer
            stopTimer();
        }
    }
});

// Help modal functions
function openHelpModal() {
    helpModal.style.display = 'grid';
}

function closeHelpModal() {
    helpModal.style.display = 'none';
}

// Event listeners
startBtn.addEventListener('click', () => {
    startGame();
});

helpBtn.addEventListener('click', openHelpModal);
helpCloseBtn.addEventListener('click', closeHelpModal);

// Close modal when clicking outside
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        closeHelpModal();
    }
});

// Make pet cheer animation
function makePetCheer() {
    if (!petSpriteEl || isPetCheering) return;
    
    isPetCheering = true;
    
    // Get happiness sprites
    const happinessSprites = JSON.parse(petSpriteEl.dataset.happinessSprites || '[]');
    if (happinessSprites.length === 0) return;
    
    // Animate between happiness sprites
    petHappinessSpriteIndex = 0;
    petHappinessInterval = setInterval(() => {
        petSpriteEl.src = happinessSprites[petHappinessSpriteIndex];
        petHappinessSpriteIndex = (petHappinessSpriteIndex + 1) % happinessSprites.length;
    }, 200);
    
    // Stop cheering after animation
    setTimeout(() => {
        if (petHappinessInterval) {
            clearInterval(petHappinessInterval);
            petHappinessInterval = null;
        }
        // Reset to walk sprite
        const PET_TYPES = {
            botamon: { walk: ['sprites/botamon/botamon.png', 'sprites/botamon/botamon 2.png'] },
            poyomon: { walk: ['sprites/poyomon/poyomon.png', 'sprites/poyomon/poyomon 2.png'] },
            punimon: { walk: ['sprites/punimon/punimon.png', 'sprites/punimon/punimon 2.png'] },
            pitchmon: { walk: ['sprites/pitchmon/pitchmon.png', 'sprites/pitchmon/pitchmon 2.png'] },
            koromon: { walk: ['sprites/koromon/koromon.png', 'sprites/koromon/koromon 2.png'] }
        };
        // Get current pet type from sprite src
        const currentSrc = petSpriteEl.src;
        for (const [type, data] of Object.entries(PET_TYPES)) {
            if (currentSrc.includes(type)) {
                petSpriteEl.src = data.walk[0];
                break;
            }
        }
        isPetCheering = false;
    }, 1800); // Match animation duration (3 cycles * 2 sprites * 200ms + buffer)
}

// Initialize on load
initGame();

