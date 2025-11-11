const { ipcRenderer } = require('electron');

// Game state
let sequence = [];
let playerSequence = [];
let round = 0;
let isPlaying = false;
let isShowingSequence = false;
let isPlayerTurn = false;

// DOM elements
const roundNumberEl = document.getElementById('roundNumber');
const statusMessageEl = document.getElementById('statusMessage');
const startBtn = document.getElementById('startBtn');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const petSpriteEl = document.getElementById('petSprite');
const petBubbleEl = document.querySelector('.pet-bubble');

// Buttons
const buttons = {
    red: document.getElementById('redBtn'),
    green: document.getElementById('greenBtn'),
    blue: document.getElementById('blueBtn'),
    yellow: document.getElementById('yellowBtn')
};

const colors = ['red', 'green', 'blue', 'yellow'];

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
			canEvolve: true,
			evolution: 'tokomon'
        },
        punimon: {
            walk: ['sprites/punimon/punimon.png', 'sprites/punimon/punimon 2.png'],
            happiness: ['sprites/punimon/punimon.png', 'sprites/punimon/punimon 3.png'],
            sleep: 'sprites/punimon/punimon 4.png',
			canEvolve: true,
			evolution: 'tsunomon'
        },
        pitchmon: {
            walk: ['sprites/pitchmon/pitchmon.png', 'sprites/pitchmon/pitchmon 2.png'],
            happiness: ['sprites/pitchmon/pitchmon.png', 'sprites/pitchmon/pitchmon 3.png'],
            sleep: 'sprites/pitchmon/pitchmon 4.png',
			canEvolve: true,
			evolution: 'pakumon'
        },
        koromon: {
            walk: ['sprites/koromon/koromon.png', 'sprites/koromon/koromon 2.png'],
            happiness: ['sprites/koromon/koromon.png', 'sprites/koromon/koromon 3.png'],
			sleep: 'sprites/koromon/koromon 4.png',
			canEvolve: true,
			evolution: 'agumon'
		},
		tokomon: {
			walk: ['sprites/tokomon/tokomon.png', 'sprites/tokomon/tokomon 2.png'],
			happiness: ['sprites/tokomon/tokomon.png', 'sprites/tokomon/tokomon 3.png'],
			sleep: 'sprites/tokomon/tokomon 4.png',
			canEvolve: true,
			evolution: 'patamon'
		},
		tsunomon: {
			walk: ['sprites/tsunomon/tsunomon.png', 'sprites/tsunomon/tsunomon 2.png'],
			happiness: ['sprites/tsunomon/tsunomon.png', 'sprites/tsunomon/tsunomon 3.png'],
			sleep: 'sprites/tsunomon/tsunomon 4.png',
			canEvolve: true,
			evolution: 'gabumon'
		},
		pakumon: {
			walk: ['sprites/pakumon/pakumon.png', 'sprites/pakumon/pakumon 2.png'],
			happiness: ['sprites/pakumon/pakumon.png', 'sprites/pakumon/pakumon 3.png'],
			sleep: 'sprites/pakumon/pakumon 4.png',
			canEvolve: true,
			evolution: 'betamon'
		},
		agumon: {
			walk: ['sprites/agumon/agumon.png', 'sprites/agumon/agumon 2.png'],
			happiness: ['sprites/agumon/agumon.png', 'sprites/agumon/agumon 3.png'],
			sleep: 'sprites/agumon/agumon 4.png',
			canEvolve: false
		},
		betamon: {
			walk: ['sprites/betamon/betamon.png', 'sprites/betamon/betamon 2.png'],
			happiness: ['sprites/betamon/betamon.png', 'sprites/betamon/betamon 3.png'],
			sleep: 'sprites/betamon/betamon 4.png',
			canEvolve: false
		},
		gabumon: {
			walk: ['sprites/gabumon/gabumon.png', 'sprites/gabumon/gabumon 2.png'],
			happiness: ['sprites/gabumon/gabumon.png', 'sprites/gabumon/gabumon 3.png'],
			sleep: 'sprites/gabumon/gabumon 4.png',
			canEvolve: false
		},
		patamon: {
			walk: ['sprites/patamon/patamon.png', 'sprites/patamon/patamon 2.png'],
			happiness: ['sprites/patamon/patamon.png', 'sprites/patamon/patamon 3.png'],
			sleep: 'sprites/patamon/patamon 4.png',
			canEvolve: false
        }
    };
    
	function getResolvedTypeForStage(typeKey, stage) {
		if (!PET_TYPES[typeKey]) return 'botamon';
		if (stage <= 1) return typeKey;
		const first = PET_TYPES[typeKey].evolution && PET_TYPES[PET_TYPES[typeKey].evolution] ? PET_TYPES[typeKey].evolution : null;
		if (stage === 2) return first || typeKey;
		if (!first) return typeKey;
		const second = PET_TYPES[first].evolution && PET_TYPES[PET_TYPES[first].evolution] ? PET_TYPES[first].evolution : null;
		return second || first;
	}
	
	function getCurrentPetData() {
		const resolvedType = getResolvedTypeForStage(petType, evolutionStage);
		return PET_TYPES[resolvedType] || PET_TYPES.botamon;
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
    sequence = [];
    playerSequence = [];
    round = 0;
    isPlaying = false;
    isShowingSequence = false;
    isPlayerTurn = false;
    
    updateUI();
    enableButtons(false);
}

// Start game
function startGame() {
    initGame();
    isPlaying = true;
    round = 1;
    addToSequence();
    updateUI();
    showSequence();
}

// Add a random color to the sequence
function addToSequence() {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    sequence.push(randomColor);
}

// Show the sequence to the player
async function showSequence() {
    isShowingSequence = true;
    isPlayerTurn = false;
    enableButtons(false);
    statusMessageEl.textContent = 'Watch the sequence...';
    
    // Wait a bit before starting
    await sleep(500);
    
    // Show each color in the sequence
    for (let i = 0; i < sequence.length; i++) {
        await sleep(300);
        highlightButton(sequence[i]);
        await sleep(500);
        unhighlightButton(sequence[i]);
    }
    
    // Now it's the player's turn
    isShowingSequence = false;
    isPlayerTurn = true;
    playerSequence = [];
    enableButtons(true);
    statusMessageEl.textContent = 'Your turn! Repeat the sequence...';
}

// Handle button click
function handleButtonClick(color) {
    if (!isPlayerTurn || isShowingSequence) return;
    
    highlightButton(color);
    playerSequence.push(color);
    
    // Check if the player's sequence matches so far
    const currentIndex = playerSequence.length - 1;
    if (playerSequence[currentIndex] !== sequence[currentIndex]) {
        // Wrong sequence - game over
        setTimeout(() => {
            unhighlightButton(color);
            gameOver();
        }, 300);
        return;
    }
    
    // Check if the player completed the sequence
    if (playerSequence.length === sequence.length) {
        // Correct! Move to next round
        setTimeout(() => {
            unhighlightButton(color);
            nextRound();
        }, 500);
    } else {
        // Still more to go
        setTimeout(() => {
            unhighlightButton(color);
        }, 200);
    }
}

// Move to next round
function nextRound() {
    round++;
    playerSequence = [];
    updateUI();
    addToSequence();
    
    // Give $2 for completing a round successfully
    // Every 3 rounds, give 2 experience
    const expReward = (round % 3 === 0) ? 2 : 0;
    
    ipcRenderer.send('game:reward', {
        money: 2,
        happiness: 0,
        experience: expReward
    });
    
    // Trigger pet happiness animation in pet window
    ipcRenderer.send('game:petHappy');
    
    // Make pet cheer in game window
    makePetCheer();
    
    showSequence();
}

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
			koromon: { walk: ['sprites/koromon/koromon.png', 'sprites/koromon/koromon 2.png'] },
			tokomon: { walk: ['sprites/tokomon/tokomon.png', 'sprites/tokomon/tokomon 2.png'] },
			tsunomon: { walk: ['sprites/tsunomon/tsunomon.png', 'sprites/tsunomon/tsunomon 2.png'] },
			pakumon: { walk: ['sprites/pakumon/pakumon.png', 'sprites/pakumon/pakumon 2.png'] },
			agumon: { walk: ['sprites/agumon/agumon.png', 'sprites/agumon/agumon 2.png'] },
			betamon: { walk: ['sprites/betamon/betamon.png', 'sprites/betamon/betamon 2.png'] },
			gabumon: { walk: ['sprites/gabumon/gabumon.png', 'sprites/gabumon/gabumon 2.png'] },
			patamon: { walk: ['sprites/patamon/patamon.png', 'sprites/patamon/patamon 2.png'] }
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

// Game over
function gameOver() {
    isPlaying = false;
    isPlayerTurn = false;
    enableButtons(false);
    
    // Calculate rewards
    const roundsCompleted = round - 1; // Subtract 1 because round increments before game over
    const moneyReward = Math.floor(roundsCompleted * 2); // $2 per round completed
    
    statusMessageEl.textContent = `Game Over! You completed ${roundsCompleted} round${roundsCompleted !== 1 ? 's' : ''}.`;
    
    // Send rewards to main process
    // On game over: pet loses 5 hunger, loses 5 rest, gains 5 happiness
    ipcRenderer.send('game:reward', {
        money: moneyReward,
        happiness: 5,
        experience: 0,
        hunger: -5,
        rest: -5
    });
    
    startBtn.disabled = false;
}

// Update UI
function updateUI() {
    roundNumberEl.textContent = round;
}

// Enable/disable buttons
function enableButtons(enabled) {
    Object.values(buttons).forEach(btn => {
        btn.disabled = !enabled;
    });
}

// Highlight a button
function highlightButton(color) {
    const button = buttons[color];
    if (button) {
        button.classList.add('active');
    }
}

// Unhighlight a button
function unhighlightButton(color) {
    const button = buttons[color];
    if (button) {
        button.classList.remove('active');
    }
}

// Utility function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    startBtn.disabled = true;
});

// Help modal listeners
helpBtn.addEventListener('click', openHelpModal);
helpCloseBtn.addEventListener('click', closeHelpModal);

// Close modal when clicking outside
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        closeHelpModal();
    }
});

// Add click listeners to color buttons
Object.keys(buttons).forEach(color => {
    buttons[color].addEventListener('click', () => {
        if (isPlayerTurn && !isShowingSequence) {
            handleButtonClick(color);
            setTimeout(() => {
                unhighlightButton(color);
            }, 200);
        }
    });
});

// Initialize on load
initGame();
