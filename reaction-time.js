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
			walk: ['sprites/basic pets/botamon/botamon.png', 'sprites/basic pets/botamon/botamon 2.png'],
			happiness: ['sprites/basic pets/botamon/botamon.png', 'sprites/basic pets/botamon/botamon 3.png'],
			sleep: 'sprites/basic pets/botamon/botamon 4.png',
            canEvolve: true,
            evolution: 'koromon'
        },
        poyomon: {
			walk: ['sprites/basic pets/poyomon/poyomon.png', 'sprites/basic pets/poyomon/poyomon 2.png'],
			happiness: ['sprites/basic pets/poyomon/poyomon.png', 'sprites/basic pets/poyomon/poyomon 3.png'],
			sleep: 'sprites/basic pets/poyomon/poyomon 4.png',
			canEvolve: true,
			evolution: 'tokomon'
        },
        punimon: {
			walk: ['sprites/basic pets/punimon/punimon.png', 'sprites/basic pets/punimon/punimon 2.png'],
			happiness: ['sprites/basic pets/punimon/punimon.png', 'sprites/basic pets/punimon/punimon 3.png'],
			sleep: 'sprites/basic pets/punimon/punimon 4.png',
			canEvolve: true,
			evolution: 'tsunomon'
        },
        pitchmon: {
			walk: ['sprites/basic pets/pitchmon/pitchmon.png', 'sprites/basic pets/pitchmon/pitchmon 2.png'],
			happiness: ['sprites/basic pets/pitchmon/pitchmon.png', 'sprites/basic pets/pitchmon/pitchmon 3.png'],
			sleep: 'sprites/basic pets/pitchmon/pitchmon 4.png',
			canEvolve: true,
			evolution: 'pakumon'
        },
        koromon: {
			walk: ['sprites/basic pets/koromon/koromon.png', 'sprites/basic pets/koromon/koromon 2.png'],
			happiness: ['sprites/basic pets/koromon/koromon.png', 'sprites/basic pets/koromon/koromon 3.png'],
			sleep: 'sprites/basic pets/koromon/koromon 4.png',
			canEvolve: true,
			evolution: 'agumon'
		},
		tokomon: {
			walk: ['sprites/basic pets/tokomon/tokomon.png', 'sprites/basic pets/tokomon/tokomon 2.png'],
			happiness: ['sprites/basic pets/tokomon/tokomon.png', 'sprites/basic pets/tokomon/tokomon 3.png'],
			sleep: 'sprites/basic pets/tokomon/tokomon 4.png',
			canEvolve: true,
			evolution: 'patamon'
		},
		tsunomon: {
			walk: ['sprites/basic pets/tsunomon/tsunomon.png', 'sprites/basic pets/tsunomon/tsunomon 2.png'],
			happiness: ['sprites/basic pets/tsunomon/tsunomon.png', 'sprites/basic pets/tsunomon/tsunomon 3.png'],
			sleep: 'sprites/basic pets/tsunomon/tsunomon 4.png',
			canEvolve: true,
			evolution: 'gabumon'
		},
		pakumon: {
			walk: ['sprites/basic pets/pakumon/pakumon.png', 'sprites/basic pets/pakumon/pakumon 2.png'],
			happiness: ['sprites/basic pets/pakumon/pakumon.png', 'sprites/basic pets/pakumon/pakumon 3.png'],
			sleep: 'sprites/basic pets/pakumon/pakumon 4.png',
			canEvolve: true,
			evolution: 'betamon'
		},
		agumon: {
			walk: ['sprites/basic pets/agumon/agumon.png', 'sprites/basic pets/agumon/agumon 2.png'],
			happiness: ['sprites/basic pets/agumon/agumon.png', 'sprites/basic pets/agumon/agumon 3.png'],
			sleep: 'sprites/basic pets/agumon/agumon 4.png',
			canEvolve: true,
			evolution: 'greymon'
		},
		betamon: {
			walk: ['sprites/basic pets/betamon/betamon.png', 'sprites/basic pets/betamon/betamon 2.png'],
			happiness: ['sprites/basic pets/betamon/betamon.png', 'sprites/basic pets/betamon/betamon 3.png'],
			sleep: 'sprites/basic pets/betamon/betamon 4.png',
			canEvolve: true,
			evolution: 'seadramon'
		},
		gabumon: {
			walk: ['sprites/basic pets/gabumon/gabumon.png', 'sprites/basic pets/gabumon/gabumon 2.png'],
			happiness: ['sprites/basic pets/gabumon/gabumon.png', 'sprites/basic pets/gabumon/gabumon 3.png'],
			sleep: 'sprites/basic pets/gabumon/gabumon 4.png',
			canEvolve: true,
			evolution: 'garurumon'
		},
		patamon: {
			walk: ['sprites/basic pets/patamon/patamon.png', 'sprites/basic pets/patamon/patamon 2.png'],
			happiness: ['sprites/basic pets/patamon/patamon.png', 'sprites/basic pets/patamon/patamon 3.png'],
			sleep: 'sprites/basic pets/patamon/patamon 4.png',
			canEvolve: true,
			evolution: 'angemon'
		},
		greymon: {
			walk: ['sprites/basic pets/greymon/greymon.png', 'sprites/basic pets/greymon/greymon 2.png'],
			happiness: ['sprites/basic pets/greymon/greymon.png', 'sprites/basic pets/greymon/greymon 3.png'],
			sleep: 'sprites/basic pets/greymon/greymon 4.png',
			canEvolve: false
		},
		garurumon: {
			walk: ['sprites/basic pets/garurumon/garurumon.png', 'sprites/basic pets/garurumon/garurumon 2.png'],
			happiness: ['sprites/basic pets/garurumon/garurumon.png', 'sprites/basic pets/garurumon/garurumon 3.png'],
			sleep: 'sprites/basic pets/garurumon/garurumon 4.png',
			canEvolve: false
		},
		angemon: {
			walk: ['sprites/basic pets/angemon/angemon.png', 'sprites/basic pets/angemon/angemon 2.png'],
			happiness: ['sprites/basic pets/angemon/angemon.png', 'sprites/basic pets/angemon/angemon 3.png'],
			sleep: 'sprites/basic pets/angemon/angemon 4.png',
			canEvolve: false
		},
		seadramon: {
			walk: ['sprites/basic pets/seadramon/seadramon.png', 'sprites/basic pets/seadramon/seadramon 2.png'],
			happiness: ['sprites/basic pets/seadramon/seadramon.png', 'sprites/basic pets/seadramon/seadramon 3.png'],
			sleep: 'sprites/basic pets/seadramon/seadramon 4.png',
			canEvolve: false
        },
		giromon: {
			walk: ['sprites/inter pets/giromon/giromon.png', 'sprites/inter pets/giromon/giromon 2.png'],
			happiness: ['sprites/inter pets/giromon/giromon.png', 'sprites/inter pets/giromon/giromon 3.png'],
			sleep: 'sprites/inter pets/giromon/giromon 4.png',
			canEvolve: true,
			evolution: 'gazimon' // Placeholder evolution - to be updated
        },
		zurumon: {
			walk: ['sprites/inter pets/zurumon/zurumon.png', 'sprites/inter pets/zurumon/zurumon 2.png'],
			happiness: ['sprites/inter pets/zurumon/zurumon.png', 'sprites/inter pets/zurumon/zurumon 3.png'],
			sleep: 'sprites/inter pets/zurumon/zurumon 4.png',
			canEvolve: true,
			evolution: 'pagumon' // Placeholder evolution - to be updated
        },
		yuramon: {
			walk: ['sprites/inter pets/yuramon/yuramon.png', 'sprites/inter pets/yuramon/yuramon 2.png'],
			happiness: ['sprites/inter pets/yuramon/yuramon.png', 'sprites/inter pets/yuramon/yuramon 3.png'],
			sleep: 'sprites/inter pets/yuramon/yuramon 4.png',
			canEvolve: true,
			evolution: 'tanemon' // Placeholder evolution - to be updated
        },
		pixiemon: {
			walk: ['sprites/inter pets/pixiemon/pixiemon.png', 'sprites/inter pets/pixiemon/pixiemon 2.png'],
			happiness: ['sprites/inter pets/pixiemon/pixiemon.png', 'sprites/inter pets/pixiemon/pixiemon 3.png'],
			sleep: 'sprites/inter pets/pixiemon/pixiemon 4.png',
			canEvolve: true,
			evolution: 'piyomon' // Placeholder evolution - to be updated
        },
		gazimon: {
			walk: ['sprites/inter pets/gazimon/gazimon.png', 'sprites/inter pets/gazimon/gazimon 2.png'],
			happiness: ['sprites/inter pets/gazimon/gazimon.png', 'sprites/inter pets/gazimon/gazimon 3.png'],
			sleep: 'sprites/inter pets/gazimon/gazimon 4.png',
			canEvolve: false // Placeholder - to be updated
        },
		pagumon: {
			walk: ['sprites/inter pets/pagumon/pagumon.png', 'sprites/inter pets/pagumon/pagumon 2.png'],
			happiness: ['sprites/inter pets/pagumon/pagumon.png', 'sprites/inter pets/pagumon/pagumon 3.png'],
			sleep: 'sprites/inter pets/pagumon/pagumon 4.png',
			canEvolve: false // Placeholder - to be updated
        },
		tanemon: {
			walk: ['sprites/inter pets/tanemon/tanemon.png', 'sprites/inter pets/tanemon/tanemon 2.png'],
			happiness: ['sprites/inter pets/tanemon/tanemon.png', 'sprites/inter pets/tanemon/tanemon 3.png'],
			sleep: 'sprites/inter pets/tanemon/tanemon 4.png',
			canEvolve: false // Placeholder - to be updated
        },
		piyomon: {
			walk: ['sprites/inter pets/piyomon/piyomon.png', 'sprites/inter pets/piyomon/piyomon 2.png'],
			happiness: ['sprites/inter pets/piyomon/piyomon.png', 'sprites/inter pets/piyomon/piyomon 3.png'],
			sleep: 'sprites/inter pets/piyomon/piyomon 4.png',
			canEvolve: false // Placeholder - to be updated
        }
    };
    
	function getResolvedTypeForStage(typeKey, stage) {
		if (!PET_TYPES[typeKey]) return 'botamon';
		let resolved = typeKey;
		for (let s = 2; s <= stage; s++) {
			const next = PET_TYPES[resolved] && PET_TYPES[resolved].evolution && PET_TYPES[PET_TYPES[resolved].evolution]
				? PET_TYPES[resolved].evolution
				: null;
			if (!next) break;
			resolved = next;
		}
		return resolved;
	}
	
	function getCurrentPetData() {
		const resolvedType = getResolvedTypeForStage(petType, evolutionStage);
		return PET_TYPES[resolvedType] || PET_TYPES.botamon;
	}
    
    const petData = getCurrentPetData();
    if (petSpriteEl && petData) {
		petSpriteEl.src = encodeURI(petData.walk[0]); // Use first walk sprite
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
		petSpriteEl.src = encodeURI(happinessSprites[petHappinessSpriteIndex]);
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
            botamon: { walk: ['sprites/basic pets/botamon/botamon.png', 'sprites/basic pets/botamon/botamon 2.png'] },
            poyomon: { walk: ['sprites/basic pets/poyomon/poyomon.png', 'sprites/basic pets/poyomon/poyomon 2.png'] },
            punimon: { walk: ['sprites/basic pets/punimon/punimon.png', 'sprites/basic pets/punimon/punimon 2.png'] },
            pitchmon: { walk: ['sprites/basic pets/pitchmon/pitchmon.png', 'sprites/basic pets/pitchmon/pitchmon 2.png'] },
			koromon: { walk: ['sprites/basic pets/koromon/koromon.png', 'sprites/basic pets/koromon/koromon 2.png'] },
			tokomon: { walk: ['sprites/basic pets/tokomon/tokomon.png', 'sprites/basic pets/tokomon/tokomon 2.png'] },
			tsunomon: { walk: ['sprites/basic pets/tsunomon/tsunomon.png', 'sprites/basic pets/tsunomon/tsunomon 2.png'] },
			pakumon: { walk: ['sprites/basic pets/pakumon/pakumon.png', 'sprites/basic pets/pakumon/pakumon 2.png'] },
			agumon: { walk: ['sprites/basic pets/agumon/agumon.png', 'sprites/basic pets/agumon/agumon 2.png'] },
			betamon: { walk: ['sprites/basic pets/betamon/betamon.png', 'sprites/basic pets/betamon/betamon 2.png'] },
			gabumon: { walk: ['sprites/basic pets/gabumon/gabumon.png', 'sprites/basic pets/gabumon/gabumon 2.png'] },
			patamon: { walk: ['sprites/basic pets/patamon/patamon.png', 'sprites/basic pets/patamon/patamon 2.png'] }
        };
        // Get current pet type from sprite src
        const currentSrc = petSpriteEl.src;
        for (const [type, data] of Object.entries(PET_TYPES)) {
            if (currentSrc.includes(type)) {
				petSpriteEl.src = encodeURI(data.walk[0]);
                break;
            }
        }
        isPetCheering = false;
    }, 1800); // Match animation duration (3 cycles * 2 sprites * 200ms + buffer)
}

// Initialize on load
initGame();

