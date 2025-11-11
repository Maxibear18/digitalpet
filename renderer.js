const { ipcRenderer } = require('electron');

// Food Types System
// Each food type has its own effects on pet stats
const FOOD_TYPES = {
    cherry: {
        name: 'Cherry',
        hunger: 10,
        happiness: 0,
        rest: 0
    },
    riceball: {
        name: 'Riceball',
        hunger: 15,
        happiness: 0,
        rest: 0
    },
    sandwich: {
        name: 'Sandwich',
        hunger: 25,
        happiness: 0,
        rest: 0
    },
    meat: {
        name: 'Meat',
        hunger: 35,
        happiness: 0,
        rest: 0
    },
    cake: {
        name: 'Cake',
        hunger: 50,
        happiness: 0,
        rest: 0
    },
    icecream: {
        name: 'Ice Cream',
        hunger: 15,
        happiness: 15,
        rest: 0
    },
    coffee: {
        name: 'Coffee',
        hunger: 10,
        happiness: 0,
        rest: 20
    }
};

// Pet Types System
// Each pet type has its own sprite set following this pattern:
// - Walking/Eating: sprite 1 and sprite 2 (alternates between them)
// - Happiness: sprite 1 and sprite 3 (alternates between them)
// - Sleep/Death: sprite 4 (static)
// - Exercise: uses happiness sprites (sprite 1 and 3)
const PET_TYPES = {
    botamon: {
        name: 'Botamon',
		walk: ['sprites/basic pets/botamon/botamon.png', 'sprites/basic pets/botamon/botamon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/botamon/botamon.png', 'sprites/basic pets/botamon/botamon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/botamon/botamon 4.png', // Sprite 4
		canEvolve: true,
        evolution: 'koromon' // Evolves into Koromon
    },
    poyomon: {
        name: 'Poyomon',
		walk: ['sprites/basic pets/poyomon/poyomon.png', 'sprites/basic pets/poyomon/poyomon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/poyomon/poyomon.png', 'sprites/basic pets/poyomon/poyomon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/poyomon/poyomon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'tokomon'
    },
    punimon: {
        name: 'Punimon',
		walk: ['sprites/basic pets/punimon/punimon.png', 'sprites/basic pets/punimon/punimon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/punimon/punimon.png', 'sprites/basic pets/punimon/punimon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/punimon/punimon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'tsunomon'
    },
    pitchmon: {
        name: 'Pitchmon',
		walk: ['sprites/basic pets/pitchmon/pitchmon.png', 'sprites/basic pets/pitchmon/pitchmon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/pitchmon/pitchmon.png', 'sprites/basic pets/pitchmon/pitchmon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/pitchmon/pitchmon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'pakumon'
    },
    koromon: {
        name: 'Koromon',
		walk: ['sprites/basic pets/koromon/koromon.png', 'sprites/basic pets/koromon/koromon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/koromon/koromon.png', 'sprites/basic pets/koromon/koromon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/koromon/koromon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'agumon'
	},
	tokomon: {
		name: 'Tokomon',
		walk: ['sprites/basic pets/tokomon/tokomon.png', 'sprites/basic pets/tokomon/tokomon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/tokomon/tokomon.png', 'sprites/basic pets/tokomon/tokomon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/tokomon/tokomon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'patamon'
	},
	tsunomon: {
		name: 'Tsunomon',
		walk: ['sprites/basic pets/tsunomon/tsunomon.png', 'sprites/basic pets/tsunomon/tsunomon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/tsunomon/tsunomon.png', 'sprites/basic pets/tsunomon/tsunomon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/tsunomon/tsunomon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'gabumon'
	},
	pakumon: {
		name: 'Pakumon',
		walk: ['sprites/basic pets/pakumon/pakumon.png', 'sprites/basic pets/pakumon/pakumon 2.png'], // Sprite 1 and 2
		happiness: ['sprites/basic pets/pakumon/pakumon.png', 'sprites/basic pets/pakumon/pakumon 3.png'], // Sprite 1 and 3
		sleep: 'sprites/basic pets/pakumon/pakumon 4.png', // Sprite 4
		canEvolve: true,
		evolution: 'betamon'
	},
	agumon: {
		name: 'Agumon',
		walk: ['sprites/basic pets/agumon/agumon.png', 'sprites/basic pets/agumon/agumon 2.png'],
		happiness: ['sprites/basic pets/agumon/agumon.png', 'sprites/basic pets/agumon/agumon 3.png'],
		sleep: 'sprites/basic pets/agumon/agumon 4.png',
		canEvolve: true,
		evolution: 'greymon'
	},
	betamon: {
		name: 'Betamon',
		walk: ['sprites/basic pets/betamon/betamon.png', 'sprites/basic pets/betamon/betamon 2.png'],
		happiness: ['sprites/basic pets/betamon/betamon.png', 'sprites/basic pets/betamon/betamon 3.png'],
		sleep: 'sprites/basic pets/betamon/betamon 4.png',
		canEvolve: true,
		evolution: 'seadramon'
	},
	gabumon: {
		name: 'Gabumon',
		walk: ['sprites/basic pets/gabumon/gabumon.png', 'sprites/basic pets/gabumon/gabumon 2.png'],
		happiness: ['sprites/basic pets/gabumon/gabumon.png', 'sprites/basic pets/gabumon/gabumon 3.png'],
		sleep: 'sprites/basic pets/gabumon/gabumon 4.png',
		canEvolve: true,
		evolution: 'garurumon'
	},
	patamon: {
		name: 'Patamon',
		walk: ['sprites/basic pets/patamon/patamon.png', 'sprites/basic pets/patamon/patamon 2.png'],
		happiness: ['sprites/basic pets/patamon/patamon.png', 'sprites/basic pets/patamon/patamon 3.png'],
		sleep: 'sprites/basic pets/patamon/patamon 4.png',
		canEvolve: true,
		evolution: 'angemon'
	},
	greymon: {
		name: 'Greymon',
		walk: ['sprites/basic pets/greymon/greymon.png', 'sprites/basic pets/greymon/greymon 2.png'],
		happiness: ['sprites/basic pets/greymon/greymon.png', 'sprites/basic pets/greymon/greymon 3.png'],
		sleep: 'sprites/basic pets/greymon/greymon 4.png',
		canEvolve: false
	},
	garurumon: {
		name: 'Garurumon',
		walk: ['sprites/basic pets/garurumon/garurumon.png', 'sprites/basic pets/garurumon/garurumon 2.png'],
		happiness: ['sprites/basic pets/garurumon/garurumon.png', 'sprites/basic pets/garurumon/garurumon 3.png'],
		sleep: 'sprites/basic pets/garurumon/garurumon 4.png',
		canEvolve: false
	},
	angemon: {
		name: 'Angemon',
		walk: ['sprites/basic pets/angemon/angemon.png', 'sprites/basic pets/angemon/angemon 2.png'],
		happiness: ['sprites/basic pets/angemon/angemon.png', 'sprites/basic pets/angemon/angemon 3.png'],
		sleep: 'sprites/basic pets/angemon/angemon 4.png',
		canEvolve: false
	},
	seadramon: {
		name: 'Seadramon',
		walk: ['sprites/basic pets/seadramon/seadramon.png', 'sprites/basic pets/seadramon/seadramon 2.png'],
		happiness: ['sprites/basic pets/seadramon/seadramon.png', 'sprites/basic pets/seadramon/seadramon 3.png'],
		sleep: 'sprites/basic pets/seadramon/seadramon 4.png',
		canEvolve: false
    }
};

// Current pet state
let currentPetType = 'botamon'; // Default pet type (will be set on hatching)
let currentEvolutionStage = 1; // 1 = base, 2 = first, 3 = second, 4 = third evolution

// Resolve the type key for a given stage in the evolution chain
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

// Get current pet data based on pet type and evolution stage
function getCurrentPetData() {
	const resolvedType = getResolvedTypeForStage(currentPetType, currentEvolutionStage);
	return PET_TYPES[resolvedType] || PET_TYPES.botamon;
}

// Get walking sprites for current pet
function getWalkSprites() {
    return getCurrentPetData().walk;
}

// Get happiness sprites for current pet
function getHappinessSprites() {
    return getCurrentPetData().happiness;
}

// Get exercise sprites for current pet (same as happiness)
function getExerciseSprites() {
    return getCurrentPetData().happiness;
}

// Get sleep sprite for current pet
function getSleepSprite() {
    return getCurrentPetData().sleep;
}

// Get size multiplier for current pet (1.0 = normal size)
function getEvolutionSizeMultiplier() {
    // Koromon is slightly smaller
    if (currentPetType === 'koromon' || (currentEvolutionStage === 2 && currentPetType === 'botamon')) {
        return 0.85; // 85% of original size
    }
    return 1.0; // Default size
}

// Update pet size based on evolution stage
function updatePetSize() {
    if (!pet) return;
    
    const sizeMultiplier = getEvolutionSizeMultiplier();
    const baseWidth = 120; // Original width
    const baseHeight = 120; // Original height (approximate, will be auto-calculated)
    
    const newWidth = baseWidth * sizeMultiplier;
    pet.style.width = newWidth + 'px';
    // Height will be auto-calculated to maintain aspect ratio
}

// Get current pet dimensions (accounts for evolution stage size)
function getPetDimensions() {
    const sizeMultiplier = getEvolutionSizeMultiplier();
    const baseSize = 120;
    return {
        width: baseSize * sizeMultiplier,
        height: baseSize * sizeMultiplier
    };
}

// Legacy sprite variables (now use getters)
let currentSpriteIndex = 0;

// Pet position
let petX = 50;
let petY = 50;
let targetX = 50;
let targetY = 50;
const walkSpeed = 0.4; // Slower movement
let pet = null;
let animationRunning = false;
let animationIntervalId = null; // Animation loop interval
let isWalking = true; // Walking state
let isEating = false; // Eating state
let isHappy = false; // Happiness animation state
let isSleeping = false; // Sleeping state
let isExercising = false; // Exercising state
let currentFoodEl = null; // Currently targeted food item
let foodItems = []; // Array of all food items on screen
let eatingTimeoutId = null;
let happinessSpriteIndex = 0; // Current sprite in happiness animation
let sleepZs = []; // Array of sleeping Z elements
let sweatParticles = []; // Array of sweat particle elements
let sweatSpawnIntervalId = null; // Interval ID for spawning sweat particles
let wasteItems = []; // Array of all waste items on screen
let wasteCount = 0; // Track total waste count for sickness mechanic
let wasteSpawnIntervalId = null; // Interval ID for waste spawning

// Egg system
let hasEgg = false; // Track if player has an egg
let isEggHatched = false; // Track if egg has hatched
let eggElement = null; // Reference to the egg element
let eggClickCount = 0; // Track clicks on egg (need 10 to hatch)
const EGGS_TO_HATCH = 10; // Number of clicks needed to hatch

// Sickness mechanic
let isSick = false; // Pet starts healthy
let medicineItems = []; // Array of all medicine items on screen
let currentMedicineEl = null; // Currently targeted medicine item
// Health decay is now handled in main.js for persistence
let sicknessBubbles = []; // Array of sickness bubble elements
let bubbleSpawnIntervalId = null; // Interval ID for spawning bubbles

// Death mechanic
let isDead = false; // Pet death state

// Experience and Evolution system
let experience = 0; // Current experience (hidden stat)
let EXPERIENCE_MAX = 300; // Experience needed for current evolution threshold
const EXPERIENCE_GAIN_EAT = 2; // Experience gained from eating
const EXPERIENCE_GAIN_PET = 2; // Experience gained from petting
const EXPERIENCE_GAIN_MOVE = 1; // Experience gained from moving
const EXPERIENCE_GAIN_TIME_INTERVAL = 180000; // 3 minutes in milliseconds
const EXPERIENCE_GAIN_TIME_AMOUNT = 10; // Experience gained every 3 minutes
let experienceTimeIntervalId = null; // Interval for passive experience gain
let isEvolving = false; // Track if evolution animation is playing

// Medkit items
let medkitItems = []; // Array of all medkit items on screen
let currentMedkitEl = null; // Currently targeted medkit item

// Toy items
let toyItems = []; // Array of all purchased toys
let isPuddingActive = false; // Track if pudding effect is active
let puddingTimerId = null; // Timer ID for pudding expiration
let isBubbleWandActive = false; // Track if bubble wand effect is active
let bubbleWandTimerId = null; // Timer ID for bubble wand expiration
let isChimesActive = false; // Track if chimes effect is active
let chimesTimerId = null; // Timer ID for chimes expiration
let isCalculatorActive = false; // Track if calculator effect is active
let calculatorTimerId = null; // Timer ID for calculator expiration
let isMusicPlayerActive = false; // Track if music player effect is active
let musicPlayerTimerId = null; // Timer ID for music player expiration
let musicPlayerHealIntervalId = null; // Interval ID for music player healing
let isPaddleActive = false; // Track if paddle effect is active
let paddleTimerId = null; // Timer ID for paddle expiration

// Petting mechanic
let petClickCount = 0; // Track number of clicks for petting
const PETS_FOR_HAPPINESS = 10; // Number of pets needed to increase happiness
let happiness = 50; // Happiness stat (0-100)
const HAPPINESS_MAX = 100;
const HAPPINESS_MIN = 0;

// Health (0-100)
let health = 50;
const HEALTH_MAX = 100;
const HEALTH_MIN = 0;
const HEALTH_DECAY_INTERVAL = 90000; // 1.5 minutes in milliseconds
const HEALTH_DECAY_AMOUNT = 10; // Amount health decreases by when sick

// Hunger (0-100)
let hunger = 50;
const HUNGER_MAX = 100;
const HUNGER_MIN = 0;
const HUNGER_DECAY_INTERVAL = 120000; // 2 minutes in milliseconds
const HUNGER_DECAY_AMOUNT = 10; // Amount hunger decreases by
let hungerDecayIntervalId = null;

// Rest (0-100)
let rest = 50;
const REST_MAX = 100;
const REST_MIN = 0;
// Rest increment/decay is now handled in main.js for persistence
let lastSpriteUpdate = 0;
let nextStateChangeTime = 0;
const spriteUpdateInterval = 300; // milliseconds
const minWalkDuration = 2000; // Minimum 2 seconds walking
const maxWalkDuration = 6000; // Maximum 6 seconds walking
const minStopDuration = 1000; // Minimum 1 second stopped
const maxStopDuration = 4000; // Maximum 4 seconds stopped

// Function to update stat bars in the pet window
function updateStatBar(key, value, max) {
    const statItem = document.querySelector(`.stat-item[data-key="${key}"]`);
    if (!statItem) return;
    
    const fill = statItem.querySelector('.stat-bar-fill');
    const valueDisplay = statItem.querySelector('.stat-value');
    
    if (!fill || !valueDisplay) return;
    
    // Calculate percentage
    const percent = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    
    // Update fill width
    fill.style.width = percent + '%';
    
    // Update value text
    valueDisplay.textContent = `${value} / ${max}`;
}

// Function to update money display
function updateMoneyDisplay(amount) {
    const moneyDisplay = document.getElementById('money-display');
    if (moneyDisplay) {
        moneyDisplay.textContent = `$${amount}`;
    }
}

// Initialize everything
window.addEventListener('load', () => {
    console.log('Window loaded, initializing pet...');
	
	// Test-only: force evolve button
	try {
		const evolveBtn = document.getElementById('evolveTestBtn');
		if (evolveBtn) {
			evolveBtn.addEventListener('click', () => {
				if (!isEvolving) {
					evolvePet();
				}
			});
		}
	} catch (_) {}
    
    // Load stored stats from main process first
    let statsLoaded = false;
    const statsToLoad = ['hunger', 'rest', 'health', 'happiness', 'experience'];
    let loadedStatsCount = 0;
    
    // Listen for stored stats from main process
    ipcRenderer.on('stats:load', (_event, payload) => {
        if (!payload || !payload.key) return;
        
        const key = payload.key;
        const value = typeof payload.value === 'number' ? payload.value : (key === 'hunger' || key === 'rest' || key === 'happiness' ? 50 : 50);
        const max = typeof payload.max === 'number' ? payload.max : 100;
        
        // Update the stat bar in the pet window (except for experience, which is hidden)
        if (key !== 'experience') {
            updateStatBar(key, value, max);
        }
        
        // Update the corresponding variable
        if (key === 'hunger') {
            hunger = value;
            console.log('Loaded stored hunger:', hunger);
        } else if (key === 'rest') {
            rest = value;
            console.log('Loaded stored rest:', rest);
        } else if (key === 'happiness') {
            happiness = value;
            console.log('Loaded stored happiness:', happiness);
        } else if (key === 'health') {
            health = value;
            console.log('Loaded stored health:', health);
        } else if (key === 'experience') {
            experience = value;
            console.log('Loaded stored experience:', experience);
        }
        
        loadedStatsCount++;
        
        // If we've loaded all expected stats (or waited a bit), proceed with initialization
        if (loadedStatsCount >= statsToLoad.length) {
            initializeAfterStatsLoad();
        }
    });
    
    // Function to initialize after stats are loaded
    function initializeAfterStatsLoad() {
        if (statsLoaded) return; // Prevent double initialization
        statsLoaded = true;
        
        initializePet();
        // Initialize rest stat (this will also send it to main.js)
        setRest(rest);
        // Initialize hunger stat (this will also send it to main.js)
        setHunger(hunger);
        // Initialize happiness stat (this will also send it to main.js)
        setHappiness(happiness);
        // Initialize health stat (this will also send it to main.js)
        setHealth(health);
        // Initialize experience stat (hidden stat, not shown in UI)
        // Note: Experience is loaded from main process via stats:load, but we send it back to persist
        try {
            ipcRenderer.send('stats:update', { key: 'experience', value: experience, max: EXPERIENCE_MAX });
        } catch (_) {}
        // Note: Hunger decay is now handled in main.js, so it persists even when windows are closed
        
        // Start waste spawning system (only if egg is hatched)
        if (isEggHatched) {
            startWasteSpawning();
        }
        
        // Hide pet initially if egg hasn't hatched
        if (!isEggHatched && !hasEgg) {
            hidePet();
        }
        
        // Update sickness state if already sick (notifies main process)
        if (isSick) {
            startHealthDecay(); // Notifies main.js to start health decay
            updateSickAppearance();
        }
        
        // Send initial waste count to main process
        sendWasteCountUpdate();
        
        // Request evolution stage from main process
        try {
            ipcRenderer.send('pet:requestEvolutionStage');
        } catch (_) {}
        
        // Start passive experience gain (experience just for existing)
        startPassiveExperienceGain();
        
        console.log('Pet initialized with stats - Health:', health, 'Hunger:', hunger, 'Rest:', rest, 'Happiness:', happiness, 'Experience:', experience, 'Evolution Stage:', currentEvolutionStage, 'Sick:', isSick);
    }
    
    // Fallback: if stats don't load within 500ms, initialize with defaults
    setTimeout(() => {
        if (!statsLoaded) {
            console.log('Stats load timeout, initializing with defaults');
            initializeAfterStatsLoad();
        }
    }, 500);
    
    // Menu placeholders
    ipcRenderer.on('menu:open', (_event, section) => {
        if (section === 'shop') {
            alert('Shop placeholder');
        } else if (section === 'stats') {
            alert('Stats placeholder');
        }
    });

    // React to pet state changes (e.g., after selling) to hide or show pet
    ipcRenderer.on('pet:stateUpdate', (_event, data) => {
        if (typeof data?.isEggHatched === 'boolean') {
            isEggHatched = data.isEggHatched;
        }
        if (typeof data?.hasEgg === 'boolean') {
            hasEgg = data.hasEgg;
        }
        if (!isEggHatched && !hasEgg) {
            hidePet();
        }
    });

    // Handle spawning items from the Shop
    ipcRenderer.on('shop:spawnItem', (_event, payload) => {
        if (!payload || !payload.imagePath) return;
        // Check item type
        if (payload.type === 'egg') {
            spawnEgg(payload.imagePath);
        } else if (payload.type === 'medicine') {
            spawnMedicineAndGoToIt(payload.imagePath, payload.medicineCost);
        } else if (payload.type === 'medkit') {
            spawnMedkitAndGoToIt(payload.imagePath, payload.medkitCost);
        } else if (payload.type === 'food') {
            spawnFoodAndGoToIt(payload.imagePath, payload.foodType, payload.foodCost);
        } else if (payload.type === 'toy') {
            spawnToy(payload.imagePath, payload.id, payload.toyCost);
        } else {
            spawnFoodAndGoToIt(payload.imagePath, payload.foodType, payload.foodCost);
        }
    });

    // Handle sleep/wake actions
    ipcRenderer.on('action:sleep', () => {
        if (!isSleeping && !isExercising) {
            startSleeping();
        }
    });

    ipcRenderer.on('action:wake', () => {
        if (isSleeping) {
            stopSleeping();
        }
    });

    // Handle exercise/stop exercise actions
    ipcRenderer.on('action:exercise', () => {
        if (!isExercising && !isSleeping && !isDead) {
            startExercising();
        }
    });

    ipcRenderer.on('action:stopExercise', () => {
        if (isExercising) {
            stopExercising();
        }
    });
    
    // Handle game-triggered happiness animation
    ipcRenderer.on('game:petHappy', () => {
        if (!isSleeping && !isDead && !isExercising) {
            playHappinessAnimation(false);
        }
    });
    
    // Listen for pet becoming sick from main process
    ipcRenderer.on('pet:becameSick', () => {
        if (!isSick && !isDead) {
            isSick = true;
            startHealthDecay(); // Notifies main.js (though it should already be running)
            updateSickAppearance();
            console.log('Pet became sick!');
        }
    });
    
    // Listen for pet becoming healthy from main process
    ipcRenderer.on('pet:becameHealthy', () => {
        if (isSick && !isDead) {
            isSick = false;
            stopHealthDecay();
            stopSicknessBubbles();
            updateSickAppearance();
            console.log('Pet became healthy!');
        }
    });
    
    // Listen for pet death from main process
    ipcRenderer.on('pet:died', () => {
        if (!isDead) {
            triggerDeath();
        }
    });
    
    // Listen for pet revival from main process
    ipcRenderer.on('pet:revived', () => {
        if (isDead) {
            revivePet();
        }
    });
    
    // Listen for evolution stage from main process
    ipcRenderer.on('pet:evolutionStage', (_event, stage) => {
        if (typeof stage === 'number' && stage >= 1) {
            currentEvolutionStage = stage;
            // Reload sprites for the correct evolution stage
            const sprites = getWalkSprites();
            const sleepSprite = getSleepSprite();
            
            // Update current sprite based on state
            if (pet) {
                if (isSleeping || isDead) {
                    pet.src = sleepSprite;
                } else if (isHappy) {
                    const happinessSprites = getHappinessSprites();
                    pet.src = happinessSprites[happinessSpriteIndex];
                } else {
                    pet.src = sprites[currentSpriteIndex];
                }
                reloadPetImageData();
                // Update pet size based on evolution stage
                updatePetSize();
            }
            console.log('Evolution stage loaded:', currentEvolutionStage);
        }
    });
    
    // Listen for pet type from main process
    ipcRenderer.on('pet:typeUpdate', (_event, petType) => {
        if (petType && PET_TYPES[petType]) {
            currentPetType = petType;
            console.log('Pet type loaded:', PET_TYPES[currentPetType].name);
            // Reload sprites if pet is already initialized
            if (pet) {
                const sprites = getWalkSprites();
                const sleepSprite = getSleepSprite();
                
                if (isSleeping || isDead) {
                    pet.src = sleepSprite;
                } else if (isHappy) {
                    const happinessSprites = getHappinessSprites();
                    pet.src = happinessSprites[happinessSpriteIndex];
                } else {
                    pet.src = sprites[currentSpriteIndex];
                }
                reloadPetImageData();
                updatePetSize();
            }
        }
    });
    
    // Listen for money updates from main process
    ipcRenderer.on('money:update', (_event, amount) => {
        updateMoneyDisplay(amount);
    });
    
    // Listen for egg hatched state from main process
    ipcRenderer.on('egg:hatchedState', (_event, hatched) => {
        isEggHatched = hatched;
        if (!isEggHatched && !hasEgg) {
            // No egg and not hatched - hide pet initially
            hidePet();
        }
    });
    
    // Request initial money from main process
    try {
        ipcRenderer.send('money:request');
    } catch (_) {}
    
    // Listen for money request response
    ipcRenderer.on('money:response', (_event, amount) => {
        updateMoneyDisplay(amount);
    });
    
    // Listen for stat updates from main process (e.g., hunger decay)
    // This ensures the pet window stays in sync with main process stats
    ipcRenderer.on('stats:update', (_event, payload) => {
        if (!payload || !payload.key) return;
        
        const key = payload.key;
        const value = typeof payload.value === 'number' ? payload.value : 0;
        const max = typeof payload.max === 'number' ? payload.max : 100;
        
        // Update the stat bar in the pet window (except for experience, which is hidden)
        if (key !== 'experience') {
            updateStatBar(key, value, max);
        }
        
        // Update local variables when stats change from main process
        if (key === 'hunger') {
            const oldHunger = hunger;
            hunger = value;
            console.log('Hunger updated from main process:', hunger);
            
            // If hunger decreased and food is available, pet should try to eat (but not if sick, sleeping, or exercising)
            if (hunger < oldHunger && hunger < HUNGER_MAX && foodItems.length > 0 && !isEating && !isHappy && !isSleeping && !isSick && !isExercising) {
                moveToNearestFood();
            }
        } else if (key === 'rest') {
            const oldRest = rest;
            rest = value;
            
            // Apply chimes bonus if rest increased and chimes is active
            if (isChimesActive && value > oldRest) {
                const restIncrease = value - oldRest;
                const bonus = restIncrease * 0.3;
                const bonusAmount = Math.ceil(bonus);
                const newRest = Math.min(REST_MAX, rest + bonusAmount);
                
                if (bonusAmount > 0) {
                    rest = newRest;
                    console.log(`Chimes bonus applied! Rest increase: ${restIncrease} -> ${restIncrease + bonusAmount} (+${bonusAmount})`);
                    // Update stat bar and notify main process
                    updateStatBar('rest', rest, REST_MAX);
                    try {
                        ipcRenderer.send('stats:update', { key: 'rest', value: rest, max: REST_MAX });
                    } catch (_) {}
                }
            }
        } else if (key === 'happiness') {
            happiness = value;
        } else if (key === 'health') {
            const oldHealth = health;
            health = value;
            // Check if pet died (health reached 0)
            if (health === 0 && oldHealth > 0 && !isDead) {
                triggerDeath();
            }
            // Check if pet was revived (health > 0 after being dead)
            else if (health > 0 && isDead) {
                revivePet();
            }
        } else if (key === 'experience') {
            const oldExperience = experience;
            experience = value;
            // Check if pet should evolve (experience reached max)
            if (experience >= EXPERIENCE_MAX && oldExperience < EXPERIENCE_MAX && !isEvolving) {
                evolvePet();
            }
        }
    });
});

function spawnFoodAndGoToIt(imagePath, foodType, foodCost) {
    if (!pet) return;
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Food';
    item.className = 'food-item'; // Add class to identify food items
    item.dataset.foodType = foodType; // Store food type for effects
    item.dataset.foodCost = foodCost || 0; // Store food cost for refund calculation
    item.style.position = 'absolute';
    item.style.imageRendering = 'pixelated';
    item.style.pointerEvents = 'auto'; // Make clickable
    item.style.cursor = 'pointer'; // Show pointer cursor
    item.style.zIndex = '90';
    item.style.width = '48px';
    item.style.height = 'auto';

    // Spawn at a random location within container
    const rect = container.getBoundingClientRect();
    const spawnX = Math.max(0, Math.min(rect.width - 48, Math.random() * (rect.width - 48)));
    const spawnY = Math.max(0, Math.min(rect.height - 48, Math.random() * (rect.height - 48)));
    item.style.left = spawnX + 'px';
    item.style.top = spawnY + 'px';

    // Add click event to remove food
    item.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to pet
        removeFoodItem(item);
    });

    container.appendChild(item);
    
    // Add to food items array
    foodItems.push(item);

    // Move pet to nearest food only if hunger is less than 100 and not sick
    if (hunger < HUNGER_MAX && !isSick) {
        moveToNearestFood();
    }
}

// Spawn medicine and make pet go to it (only if sick)
function spawnMedicineAndGoToIt(imagePath, medicineCost) {
    if (!pet) return;
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Medicine';
    item.className = 'medicine-item'; // Add class to identify medicine items
    item.dataset.medicineCost = medicineCost || 0; // Store medicine cost for refund calculation
    item.style.position = 'absolute';
    item.style.imageRendering = 'pixelated';
    item.style.pointerEvents = 'auto'; // Make clickable
    item.style.cursor = 'pointer'; // Show pointer cursor
    item.style.zIndex = '95'; // Higher than food so it's more visible
    item.style.width = '48px';
    item.style.height = 'auto';

    // Spawn at a random location within container
    const rect = container.getBoundingClientRect();
    const spawnX = Math.max(0, Math.min(rect.width - 48, Math.random() * (rect.width - 48)));
    const spawnY = Math.max(0, Math.min(rect.height - 48, Math.random() * (rect.height - 48)));
    item.style.left = spawnX + 'px';
    item.style.top = spawnY + 'px';

    // Add click event to remove medicine
    item.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to pet
        removeMedicineItem(item);
    });

    container.appendChild(item);
    
    // Add to medicine items array
    medicineItems.push(item);

    // Move pet to nearest medicine only if sick
    if (isSick) {
        moveToNearestMedicine();
    }
}

// Remove a medicine item when clicked by user
function removeMedicineItem(medicineItem) {
    if (!medicineItem || !medicineItem.parentNode) return;
    
    // Calculate refund: half of purchase price, rounded up
    const medicineCost = parseFloat(medicineItem.dataset.medicineCost) || 0;
    if (medicineCost > 0) {
        const refundAmount = Math.ceil(medicineCost / 2);
        // Send refund to main process
        try {
            ipcRenderer.send('item:refund', refundAmount);
        } catch (_) {}
        console.log(`Medicine removed. Refund: $${refundAmount} (half of $${medicineCost}, rounded up)`);
    }
    
    // Remove from DOM
    medicineItem.parentNode.removeChild(medicineItem);
    
    // Remove from medicine items array
    medicineItems = medicineItems.filter(med => med !== medicineItem);
    
    // If this was the current target, clear it and find nearest medicine if available
    if (currentMedicineEl === medicineItem) {
        currentMedicineEl = null;
        if (medicineItems.length > 0 && isSick) {
            moveToNearestMedicine();
        }
    }
}

// Find all medicine items on screen and return the nearest one to the pet
function findNearestMedicine() {
    if (!pet || medicineItems.length === 0) return null;
    
    const container = document.querySelector('.pet-container');
    if (!container) return null;
    
    let nearestMedicine = null;
    let minDistance = Infinity;
    
    // Filter out any medicine items that have been removed from DOM
    medicineItems = medicineItems.filter(med => {
        if (!med.parentNode) return false; // Item was removed
        return true;
    });
    
    if (medicineItems.length === 0) return null;
    
    // Find nearest medicine item
    medicineItems.forEach(med => {
        const medX = parseFloat(med.style.left);
        const medY = parseFloat(med.style.top);
        
        // Calculate distance from pet to medicine
        const dx = medX - petX;
        const dy = medY - petY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestMedicine = med;
        }
    });
    
    return nearestMedicine;
}

// Move pet to the nearest medicine item (only if sick)
function moveToNearestMedicine() {
    if (!pet || isDead || !isSick) return; // Only go to medicine if sick and not dead
    
    const nearestMedicine = findNearestMedicine();
    if (!nearestMedicine) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    currentMedicineEl = nearestMedicine;
    
    // Get medicine position
    const medX = parseFloat(nearestMedicine.style.left);
    const medY = parseFloat(nearestMedicine.style.top);
    
    isEating = false;
    
    // Interrupt any current behavior and immediately walk toward the medicine
    isWalking = true;
    isHappy = false; // Stop happiness animation if it's playing
    
    // Aim pet so its center aligns over the medicine center
    const { width: petWidth, height: petHeight } = getPetDimensions();
    const medWidth = 48;
    const medHeight = 48;
    let desiredX = medX + (medWidth / 2) - (petWidth / 2);
    let desiredY = medY + (medHeight / 2) - (petHeight / 2);
    // Nudge slightly toward the medicine so the pet overlaps it more
    desiredX -= 8;
    desiredY -= 6;
    targetX = Math.max(0, Math.min(desiredX, rect.width - petWidth));
    targetY = Math.max(0, Math.min(desiredY, rect.height - petHeight));
}

// Begin eating medicine
function beginEatingMedicine() {
    // Can't eat when dead
    if (isDead) {
        currentMedicineEl = null;
        return;
    }
    
    // Verify medicine still exists and is in the medicine items array
    if (!currentMedicineEl || !currentMedicineEl.parentNode || isEating) {
        // Medicine was removed or invalid, find nearest medicine if available
        if (medicineItems.length > 0 && isSick && !isDead) {
            moveToNearestMedicine();
        }
        return;
    }
    
    // Verify this medicine is still in our medicine items array
    if (!medicineItems.includes(currentMedicineEl)) {
        // Medicine was removed from array but element still exists, find nearest
        if (medicineItems.length > 0 && isSick) {
            moveToNearestMedicine();
        }
        return;
    }
    
    // Arrived at medicine: stop moving and eat
    isWalking = false;
    isEating = true;
    
    if (eatingTimeoutId) {
        clearTimeout(eatingTimeoutId);
        eatingTimeoutId = null;
    }
    
    eatingTimeoutId = setTimeout(() => {
        finishEatingMedicine();
    }, 5000); // 5 seconds
}

// Finish eating medicine and cure sickness
function finishEatingMedicine() {
    // Remove the medicine element that was just eaten
    if (currentMedicineEl && currentMedicineEl.parentNode) {
        currentMedicineEl.parentNode.removeChild(currentMedicineEl);
    }
    
    // Remove from medicine items array
    medicineItems = medicineItems.filter(med => med !== currentMedicineEl);
    
    currentMedicineEl = null;
    isEating = false;
    
    // Gain experience from eating medicine
    addExperience(EXPERIENCE_GAIN_EAT);
    
    // Cure the sickness
    cureSickness();
    
    // Play happiness animation
    playHappinessAnimation(false);
}

// Spawn medkit and make pet go to it (can be used anytime, not just when sick)
function spawnMedkitAndGoToIt(imagePath, medkitCost) {
    if (!pet) return;
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Medkit';
    item.className = 'medkit-item'; // Add class to identify medkit items
    item.dataset.medkitCost = medkitCost || 0; // Store medkit cost for refund calculation
    item.style.position = 'absolute';
    item.style.imageRendering = 'pixelated';
    item.style.pointerEvents = 'auto'; // Make clickable
    item.style.cursor = 'pointer'; // Show pointer cursor
    item.style.zIndex = '95'; // Higher than food so it's more visible
    item.style.width = '48px';
    item.style.height = 'auto';

    // Spawn at a random location within container
    const rect = container.getBoundingClientRect();
    const spawnX = Math.max(0, Math.min(rect.width - 48, Math.random() * (rect.width - 48)));
    const spawnY = Math.max(0, Math.min(rect.height - 48, Math.random() * (rect.height - 48)));
    item.style.left = spawnX + 'px';
    item.style.top = spawnY + 'px';

    // Add click event to remove medkit
    item.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to pet
        removeMedkitItem(item);
    });

    container.appendChild(item);
    
    // Add to medkit items array
    medkitItems.push(item);

    // Move pet to nearest medkit (can be used anytime)
    moveToNearestMedkit();
}

// Remove a medkit item when clicked by user
function removeMedkitItem(medkitItem) {
    if (!medkitItem || !medkitItem.parentNode) return;
    
    // Calculate refund: half of purchase price, rounded up
    const medkitCost = parseFloat(medkitItem.dataset.medkitCost) || 0;
    if (medkitCost > 0) {
        const refundAmount = Math.ceil(medkitCost / 2);
        // Send refund to main process
        try {
            ipcRenderer.send('item:refund', refundAmount);
        } catch (_) {}
        console.log(`Medkit removed. Refund: $${refundAmount} (half of $${medkitCost}, rounded up)`);
    }
    
    // Remove from DOM
    medkitItem.parentNode.removeChild(medkitItem);
    
    // Remove from medkit items array
    medkitItems = medkitItems.filter(medkit => medkit !== medkitItem);
    
    // If this was the current target, clear it and find nearest medkit if available
    if (currentMedkitEl === medkitItem) {
        currentMedkitEl = null;
        if (medkitItems.length > 0) {
            moveToNearestMedkit();
        }
    }
}

// Find all medkit items on screen and return the nearest one to the pet
function findNearestMedkit() {
    if (!pet || medkitItems.length === 0) return null;
    
    const container = document.querySelector('.pet-container');
    if (!container) return null;
    
    let nearestMedkit = null;
    let minDistance = Infinity;
    
    // Filter out any medkit items that have been removed from DOM
    medkitItems = medkitItems.filter(medkit => {
        if (!medkit.parentNode) return false; // Item was removed
        return true;
    });
    
    if (medkitItems.length === 0) return null;
    
    // Find nearest medkit item
    medkitItems.forEach(medkit => {
        const medkitX = parseFloat(medkit.style.left);
        const medkitY = parseFloat(medkit.style.top);
        
        // Calculate distance from pet to medkit
        const dx = medkitX - petX;
        const dy = medkitY - petY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestMedkit = medkit;
        }
    });
    
    return nearestMedkit;
}

// Move pet to the nearest medkit item (can be used anytime)
function moveToNearestMedkit() {
    if (!pet || isDead) return; // Can't move when dead
    
    const nearestMedkit = findNearestMedkit();
    if (!nearestMedkit) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    currentMedkitEl = nearestMedkit;
    
    // Get medkit position
    const medkitX = parseFloat(nearestMedkit.style.left);
    const medkitY = parseFloat(nearestMedkit.style.top);
    
    isEating = false;
    
    // Interrupt any current behavior and immediately walk toward the medkit
    isWalking = true;
    isHappy = false; // Stop happiness animation if it's playing
    
    // Aim pet so its center aligns over the medkit center
    const { width: petWidth, height: petHeight } = getPetDimensions();
    const medkitWidth = 48;
    const medkitHeight = 48;
    let desiredX = medkitX + (medkitWidth / 2) - (petWidth / 2);
    let desiredY = medkitY + (medkitHeight / 2) - (petHeight / 2);
    // Nudge slightly toward the medkit so the pet overlaps it more
    desiredX -= 8;
    desiredY -= 6;
    targetX = Math.max(0, Math.min(desiredX, rect.width - petWidth));
    targetY = Math.max(0, Math.min(desiredY, rect.height - petHeight));
}

// Begin eating medkit
function beginEatingMedkit() {
    // Can't eat when dead
    if (isDead) {
        currentMedkitEl = null;
        return;
    }
    
    // Verify medkit still exists and is in the medkit items array
    if (!currentMedkitEl || !currentMedkitEl.parentNode || isEating) {
        // Medkit was removed or invalid, find nearest medkit if available
        if (medkitItems.length > 0 && !isDead) {
            moveToNearestMedkit();
        }
        return;
    }
    
    // Verify this medkit is still in our medkit items array
    if (!medkitItems.includes(currentMedkitEl)) {
        // Medkit was removed from array but element still exists, find nearest
        if (medkitItems.length > 0) {
            moveToNearestMedkit();
        }
        return;
    }
    
    // Arrived at medkit: stop moving and eat
    isWalking = false;
    isEating = true;
    
    if (eatingTimeoutId) {
        clearTimeout(eatingTimeoutId);
        eatingTimeoutId = null;
    }
    
    eatingTimeoutId = setTimeout(() => {
        finishEatingMedkit();
    }, 5000); // 5 seconds
}

// Finish eating medkit and restore health
function finishEatingMedkit() {
    // Remove the medkit element that was just eaten
    if (currentMedkitEl && currentMedkitEl.parentNode) {
        currentMedkitEl.parentNode.removeChild(currentMedkitEl);
    }
    
    // Remove from medkit items array
    medkitItems = medkitItems.filter(medkit => medkit !== currentMedkitEl);
    
    currentMedkitEl = null;
    isEating = false;
    
    // Gain experience from eating medkit
    addExperience(EXPERIENCE_GAIN_EAT);
    
    // Increase health by 25
    // setHealth() sends update to main.js, so this persists even when window is minimized/unfocused
    setHealth(health + 25);
    
    // Play happiness animation
    playHappinessAnimation(false);
}

// Spawn toy and display it in the bottom right
function spawnToy(imagePath, toyId, toyCost) {
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Toy';
    item.className = 'toy-item'; // Add class to identify toy items
    item.dataset.toyId = toyId; // Store toy ID
    item.dataset.toyCost = toyCost || 0; // Store toy cost
    item.style.position = 'absolute';
    item.style.imageRendering = 'pixelated';
    item.style.pointerEvents = 'auto'; // Make clickable
    item.style.cursor = 'pointer'; // Show pointer cursor
    item.style.zIndex = '100'; // High z-index to appear above other items
    item.style.width = '32px'; // Smaller size for icons
    item.style.height = 'auto';
    item.style.bottom = '8px'; // Position at bottom
    item.style.right = '8px'; // Start at right edge

    container.appendChild(item);
    
    // Add to toy items array
    toyItems.push(item);
    
    // Update positions of all toys to ensure proper stacking
    // This will position the new toy correctly based on its index
    updateToyPositions();
    
    // Special handling for each toy: activate effect and set timer
    if (toyId === 'pudding') {
        activatePuddingEffect(item);
    } else if (toyId === 'bubblewand') {
        activateBubbleWandEffect(item);
    } else if (toyId === 'chimes') {
        activateChimesEffect(item);
    } else if (toyId === 'calculator') {
        activateCalculatorEffect(item);
    } else if (toyId === 'musicplayer') {
        activateMusicPlayerEffect(item);
    } else if (toyId === 'paddle') {
        activatePaddleEffect(item);
    }
}

// Activate pudding effect and set timer
function activatePuddingEffect(puddingItem) {
    // Activate pudding effect
    isPuddingActive = true;
    
    // Clear any existing timer
    if (puddingTimerId) {
        clearTimeout(puddingTimerId);
    }
    
    // Set timer for 25 minutes (1500000 ms)
    const PUDDING_DURATION = 1500000; // 25 minutes
    puddingTimerId = setTimeout(() => {
        deactivatePuddingEffect(puddingItem);
    }, PUDDING_DURATION);
    
    console.log('Pudding effect activated! Hunger increases will be boosted by 30% for 25 minutes.');
}

// Deactivate pudding effect and remove icon
function deactivatePuddingEffect(puddingItem) {
    // Deactivate pudding effect
    isPuddingActive = false;
    puddingTimerId = null;
    
    // Remove pudding from toy items array
    toyItems = toyItems.filter(toy => toy !== puddingItem);
    
    // Remove pudding icon from DOM
    if (puddingItem && puddingItem.parentNode) {
        puddingItem.parentNode.removeChild(puddingItem);
    }
    
    // Update positions of remaining toys
    updateToyPositions();
    
    console.log('Pudding effect expired. Icon removed.');
}

// Activate bubble wand effect and set timer
function activateBubbleWandEffect(bubbleWandItem) {
    isBubbleWandActive = true;
    
    if (bubbleWandTimerId) {
        clearTimeout(bubbleWandTimerId);
    }
    
    const BUBBLE_WAND_DURATION = 1500000; // 25 minutes
    bubbleWandTimerId = setTimeout(() => {
        deactivateBubbleWandEffect(bubbleWandItem);
    }, BUBBLE_WAND_DURATION);
    
    console.log('Bubble Wand effect activated! Happiness increases will be boosted by 30% for 25 minutes.');
}

// Deactivate bubble wand effect and remove icon
function deactivateBubbleWandEffect(bubbleWandItem) {
    isBubbleWandActive = false;
    bubbleWandTimerId = null;
    
    toyItems = toyItems.filter(toy => toy !== bubbleWandItem);
    
    if (bubbleWandItem && bubbleWandItem.parentNode) {
        bubbleWandItem.parentNode.removeChild(bubbleWandItem);
    }
    
    updateToyPositions();
    console.log('Bubble Wand effect expired. Icon removed.');
}

// Activate chimes effect and set timer
function activateChimesEffect(chimesItem) {
    isChimesActive = true;
    
    if (chimesTimerId) {
        clearTimeout(chimesTimerId);
    }
    
    const CHIMES_DURATION = 1500000; // 25 minutes
    chimesTimerId = setTimeout(() => {
        deactivateChimesEffect(chimesItem);
    }, CHIMES_DURATION);
    
    console.log('Chimes effect activated! Rest increases will be boosted by 30% for 25 minutes.');
}

// Deactivate chimes effect and remove icon
function deactivateChimesEffect(chimesItem) {
    isChimesActive = false;
    chimesTimerId = null;
    
    toyItems = toyItems.filter(toy => toy !== chimesItem);
    
    if (chimesItem && chimesItem.parentNode) {
        chimesItem.parentNode.removeChild(chimesItem);
    }
    
    updateToyPositions();
    console.log('Chimes effect expired. Icon removed.');
}

// Activate calculator effect and set timer
function activateCalculatorEffect(calculatorItem) {
    isCalculatorActive = true;
    
    if (calculatorTimerId) {
        clearTimeout(calculatorTimerId);
    }
    
    const CALCULATOR_DURATION = 1500000; // 25 minutes
    calculatorTimerId = setTimeout(() => {
        deactivateCalculatorEffect(calculatorItem);
    }, CALCULATOR_DURATION);
    
    console.log('Calculator effect activated! Money from minigames will be boosted by 30% for 25 minutes.');
}

// Deactivate calculator effect and remove icon
function deactivateCalculatorEffect(calculatorItem) {
    isCalculatorActive = false;
    calculatorTimerId = null;
    
    toyItems = toyItems.filter(toy => toy !== calculatorItem);
    
    if (calculatorItem && calculatorItem.parentNode) {
        calculatorItem.parentNode.removeChild(calculatorItem);
    }
    
    updateToyPositions();
    console.log('Calculator effect expired. Icon removed.');
}

// Activate music player effect and set timer
function activateMusicPlayerEffect(musicPlayerItem) {
    isMusicPlayerActive = true;
    
    if (musicPlayerTimerId) {
        clearTimeout(musicPlayerTimerId);
    }
    
    // Clear any existing heal interval
    if (musicPlayerHealIntervalId) {
        clearInterval(musicPlayerHealIntervalId);
    }
    
    const MUSIC_PLAYER_DURATION = 900000; // 15 minutes
    musicPlayerTimerId = setTimeout(() => {
        deactivateMusicPlayerEffect(musicPlayerItem);
    }, MUSIC_PLAYER_DURATION);
    
    // Start healing interval: +2 health every 45 seconds
    const HEAL_INTERVAL = 45000; // 45 seconds
    musicPlayerHealIntervalId = setInterval(() => {
        if (isMusicPlayerActive && !isDead) {
            setHealth(health + 2);
            console.log('Music Player healed +2 health!');
        }
    }, HEAL_INTERVAL);
    
    console.log('Music Player effect activated! Will heal +2 health every 45 seconds for 15 minutes.');
}

// Deactivate music player effect and remove icon
function deactivateMusicPlayerEffect(musicPlayerItem) {
    isMusicPlayerActive = false;
    musicPlayerTimerId = null;
    
    // Stop healing interval
    if (musicPlayerHealIntervalId) {
        clearInterval(musicPlayerHealIntervalId);
        musicPlayerHealIntervalId = null;
    }
    
    toyItems = toyItems.filter(toy => toy !== musicPlayerItem);
    
    if (musicPlayerItem && musicPlayerItem.parentNode) {
        musicPlayerItem.parentNode.removeChild(musicPlayerItem);
    }
    
    updateToyPositions();
    console.log('Music Player effect expired. Icon removed.');
}

// Activate paddle effect and set timer
function activatePaddleEffect(paddleItem) {
    isPaddleActive = true;
    
    if (paddleTimerId) {
        clearTimeout(paddleTimerId);
    }
    
    const PADDLE_DURATION = 900000; // 15 minutes
    paddleTimerId = setTimeout(() => {
        deactivatePaddleEffect(paddleItem);
    }, PADDLE_DURATION);
    
    console.log('Paddle effect activated! Experience gains will be boosted by 30% for 15 minutes.');
}

// Deactivate paddle effect and remove icon
function deactivatePaddleEffect(paddleItem) {
    isPaddleActive = false;
    paddleTimerId = null;
    
    toyItems = toyItems.filter(toy => toy !== paddleItem);
    
    if (paddleItem && paddleItem.parentNode) {
        paddleItem.parentNode.removeChild(paddleItem);
    }
    
    updateToyPositions();
    console.log('Paddle effect expired. Icon removed.');
}

// Update positions of all toys to ensure proper stacking
function updateToyPositions() {
    const toyWidth = 32;
    const toySpacing = 4;
    const padding = 8;
    
    toyItems.forEach((toy, index) => {
        if (toy.parentNode) {
            const rightPosition = padding + (index * (toyWidth + toySpacing));
            toy.style.right = rightPosition + 'px';
        }
    });
}

// Remove a food item when clicked by user
function removeFoodItem(foodItem) {
    if (!foodItem || !foodItem.parentNode) return;
    
    // Calculate refund: half of purchase price, rounded up
    const foodCost = parseFloat(foodItem.dataset.foodCost) || 0;
    if (foodCost > 0) {
        const refundAmount = Math.ceil(foodCost / 2);
        // Send refund to main process
        try {
            ipcRenderer.send('food:refund', refundAmount);
        } catch (_) {}
        console.log(`Food removed. Refund: $${refundAmount} (half of $${foodCost}, rounded up)`);
    }
    
    // Remove from DOM
    foodItem.parentNode.removeChild(foodItem);
    
    // Remove from food items array
    foodItems = foodItems.filter(food => food !== foodItem);
    
    // If this was the current target, clear it and find nearest food if available
    if (currentFoodEl === foodItem) {
        currentFoodEl = null;
        if (foodItems.length > 0 && hunger < HUNGER_MAX) {
            moveToNearestFood();
        }
    }
}

// Find all food items on screen and return the nearest one to the pet
function findNearestFood() {
    if (!pet || foodItems.length === 0) return null;
    
    const container = document.querySelector('.pet-container');
    if (!container) return null;
    
    let nearestFood = null;
    let minDistance = Infinity;
    
    // Filter out any food items that have been removed from DOM
    foodItems = foodItems.filter(food => {
        if (!food.parentNode) return false; // Item was removed
        return true;
    });
    
    if (foodItems.length === 0) return null;
    
    // Find nearest food item
    foodItems.forEach(food => {
        const foodRect = food.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const foodX = parseFloat(food.style.left);
        const foodY = parseFloat(food.style.top);
        
        // Calculate distance from pet to food
        const dx = foodX - petX;
        const dy = foodY - petY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestFood = food;
        }
    });
    
    return nearestFood;
}

// Move pet to the nearest food item
function moveToNearestFood() {
    // Don't move to food if dead, sick, full, sleeping, or exercising
    if (!pet || isDead || hunger >= HUNGER_MAX || isSick || isSleeping || isExercising) return;
    
    const nearestFood = findNearestFood();
    if (!nearestFood) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    currentFoodEl = nearestFood;
    
    // Get food position
    const foodX = parseFloat(nearestFood.style.left);
    const foodY = parseFloat(nearestFood.style.top);
    
    isEating = false;
    
    // Interrupt any current behavior and immediately walk toward the food
    isWalking = true;
    isHappy = false; // Stop happiness animation if it's playing
    
    // Aim pet so its center aligns over the food center
    const { width: petWidth, height: petHeight } = getPetDimensions();
    const foodWidth = 48;
    const foodHeight = 48;
    let desiredX = foodX + (foodWidth / 2) - (petWidth / 2);
    let desiredY = foodY + (foodHeight / 2) - (petHeight / 2);
    // Nudge slightly toward the food so the pet overlaps it more
    desiredX -= 8;
    desiredY -= 6;
    targetX = Math.max(0, Math.min(desiredX, rect.width - petWidth));
    targetY = Math.max(0, Math.min(desiredY, rect.height - petHeight));
}

// Cache for sprite image data for pixel-perfect hit detection
let petImageData = null;
let petImageLoaded = false;

// Load image data for pixel-perfect hit detection
function loadPetImageData() {
    if (!pet) return;
    
    const currentSrc = pet.src;
    if (!currentSrc) return;
    
    const img = new Image();
    // Try with crossOrigin for remote images, but it might fail for local files
    // If it fails, we'll catch it and retry without crossOrigin
    img.onload = function() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            petImageData = ctx.getImageData(0, 0, img.width, img.height);
            petImageLoaded = true;
            console.log('Pet image data loaded for pixel-perfect hit detection');
        } catch (e) {
            console.warn('Could not load image data (possibly CORS issue):', e);
            // Fall back to bounding box detection
            petImageLoaded = false;
        }
    };
    img.onerror = function() {
        // If crossOrigin fails, try without it (for local files)
        if (img.crossOrigin) {
            const retryImg = new Image();
            retryImg.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = retryImg.width;
                    canvas.height = retryImg.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(retryImg, 0, 0);
                    petImageData = ctx.getImageData(0, 0, retryImg.width, retryImg.height);
                    petImageLoaded = true;
                    console.log('Pet image data loaded (without CORS)');
                } catch (e) {
                    console.warn('Could not load image data:', e);
                    petImageLoaded = false;
                }
            };
            retryImg.src = currentSrc;
        }
    };
    
    // Try with crossOrigin first (for remote images if needed)
    img.crossOrigin = 'anonymous';
    img.src = currentSrc;
}

// Function to reload image data when sprite changes
function reloadPetImageData() {
    petImageLoaded = false;
    petImageData = null;
    loadPetImageData();
}

// Check if a click hit an opaque pixel in the pet sprite
function isClickOnPetPixel(clickX, clickY) {
    if (!pet || !petImageLoaded || !petImageData) {
        // Fallback: if image data not loaded yet, use bounding box
        return true;
    }
    
    const petRect = pet.getBoundingClientRect();
    const container = document.querySelector('.pet-container');
    if (!container) return false;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate click position relative to pet element
    const relativeX = clickX - petRect.left;
    const relativeY = clickY - petRect.top;
    
    // Check if click is within pet bounds
    if (relativeX < 0 || relativeY < 0 || relativeX >= petRect.width || relativeY >= petRect.height) {
        return false;
    }
    
    // Calculate which pixel in the source image was clicked
    const imageWidth = petImageData.width;
    const imageHeight = petImageData.height;
    const displayWidth = petRect.width;
    const displayHeight = petRect.height;
    
    const sourceX = Math.floor((relativeX / displayWidth) * imageWidth);
    const sourceY = Math.floor((relativeY / displayHeight) * imageHeight);
    
    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(imageWidth - 1, sourceX));
    const clampedY = Math.max(0, Math.min(imageHeight - 1, sourceY));
    
    // Get pixel data (RGBA format)
    const pixelIndex = (clampedY * imageWidth + clampedX) * 4;
    const alpha = petImageData.data[pixelIndex + 3];
    
    // Return true if pixel is opaque (alpha > 0)
    return alpha > 0;
}

function initializePet() {
    pet = document.getElementById('pet');
    
    if (!pet) {
        console.error('Pet element not found!');
        setTimeout(initializePet, 100);
        return;
    }
    
    console.log('Pet element found!');
    
    // Make sure pet is visible (unless egg hasn't hatched)
    pet.style.position = 'absolute';
    pet.style.display = isEggHatched ? 'block' : 'none'; // Hide if egg not hatched
    pet.style.visibility = isEggHatched ? 'visible' : 'hidden';
    pet.style.opacity = isEggHatched ? '1' : '0';
    pet.style.left = '50px';
    pet.style.top = '50px';
    pet.style.zIndex = '100';
    pet.style.pointerEvents = isEggHatched ? 'auto' : 'none'; // Ensure pet can receive clicks
    
    // Update appearance based on sickness state
    updateSickAppearance();
    
    // Update pet size based on evolution stage
    updatePetSize();
    
    // Load image data for pixel-perfect hit detection
    loadPetImageData();
    
    // Add click handler for petting with pixel-perfect detection
    let mouseDownX = 0;
    let mouseDownY = 0;
    let hasMoved = false;
    
    pet.addEventListener('mousedown', (e) => {
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        hasMoved = false;
    });
    
    // Track mouse movement to detect dragging
    document.addEventListener('mousemove', (e) => {
        if (mouseDownX !== 0 || mouseDownY !== 0) {
            const moveDistance = Math.sqrt(
                Math.pow(e.clientX - mouseDownX, 2) + 
                Math.pow(e.clientY - mouseDownY, 2)
            );
            if (moveDistance > 5) {
                hasMoved = true;
            }
        }
    });
    
    pet.addEventListener('mouseup', (e) => {
        // First, check if click hit a food or waste item (even if pet is visually on top)
        // This ensures food/waste items are always clickable
        let clickedItem = null;
        
        // Check all food items
        for (let food of foodItems) {
            if (!food.parentNode) continue; // Skip removed items
            const foodRect = food.getBoundingClientRect();
            if (e.clientX >= foodRect.left && e.clientX <= foodRect.right &&
                e.clientY >= foodRect.top && e.clientY <= foodRect.bottom) {
                clickedItem = food;
                break;
            }
        }
        
        // Check all medicine items if no food was clicked
        if (!clickedItem) {
            for (let med of medicineItems) {
                if (!med.parentNode) continue; // Skip removed items
                const medRect = med.getBoundingClientRect();
                if (e.clientX >= medRect.left && e.clientX <= medRect.right &&
                    e.clientY >= medRect.top && e.clientY <= medRect.bottom) {
                    clickedItem = med;
                    break;
                }
            }
        }
        
        // Check all medkit items if no food or medicine was clicked
        if (!clickedItem) {
            for (let medkit of medkitItems) {
                if (!medkit.parentNode) continue; // Skip removed items
                const medkitRect = medkit.getBoundingClientRect();
                if (e.clientX >= medkitRect.left && e.clientX <= medkitRect.right &&
                    e.clientY >= medkitRect.top && e.clientY <= medkitRect.bottom) {
                    clickedItem = medkit;
                    break;
                }
            }
        }
        
        // Check all waste items if no food, medicine, or medkit was clicked
        if (!clickedItem) {
            for (let waste of wasteItems) {
                if (!waste.parentNode) continue; // Skip removed items
                const wasteRect = waste.getBoundingClientRect();
                if (e.clientX >= wasteRect.left && e.clientX <= wasteRect.right &&
                    e.clientY >= wasteRect.top && e.clientY <= wasteRect.bottom) {
                    clickedItem = waste;
                    break;
                }
            }
        }
        
        // If we clicked on a food/medicine/waste item, trigger its click event
        if (clickedItem && !hasMoved) {
            // Stop propagation to prevent pet click from firing
            e.stopPropagation();
            // Create and dispatch a click event on the item
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: e.clientX,
                clientY: e.clientY
            });
            clickedItem.dispatchEvent(clickEvent);
            // Reset tracking and return early
            mouseDownX = 0;
            mouseDownY = 0;
            hasMoved = false;
            return;
        }
        
        // Only trigger petting if:
        // 1. It wasn't a drag
        // 2. Pet is not dead, sleeping, or exercising
        // 3. Click didn't hit food/medicine/medkit/waste
        // 4. Click hit an actual opaque pixel in the pet sprite
        if (!hasMoved && !isDead && !isSleeping && !isExercising && !clickedItem && isClickOnPetPixel(e.clientX, e.clientY)) {
            handlePetClick();
        }
        // Reset tracking
        mouseDownX = 0;
        mouseDownY = 0;
        hasMoved = false;
    });
    
    // Get container dimensions
    const container = document.querySelector('.pet-container');
    if (container) {
        const rect = container.getBoundingClientRect();
        console.log('Container size:', rect.width, rect.height);
        
        // Set initial position to center
        const { width: petWidth, height: petHeight } = getPetDimensions();
        petX = (rect.width - petWidth) / 2;
        petY = (rect.height - petHeight) / 2;
        
        pet.style.left = petX + 'px';
        pet.style.top = petY + 'px';
        
        // Set initial target
        chooseNewTarget();
        
        // Schedule first state change (only if egg is hatched)
        if (isEggHatched) {
            scheduleNextStateChange();
            
            // Start animation
            if (!animationRunning) {
                startAnimation();
            }
        }
    } else {
        console.error('Container not found!');
    }
}

// Hide pet (when egg hasn't hatched)
function hidePet() {
    if (!pet) return;
    pet.style.display = 'none';
    pet.style.visibility = 'hidden';
    pet.style.opacity = '0';
    pet.style.pointerEvents = 'none';
    // Stop animation
    if (animationRunning) {
        stopAnimation();
    }
}

// Show pet (after egg hatches)
function showPet() {
    if (!pet) return;
    pet.style.display = 'block';
    pet.style.visibility = 'visible';
    pet.style.opacity = '1';
    pet.style.pointerEvents = 'auto';
    // Start animation
    if (!animationRunning) {
        startAnimation();
        scheduleNextStateChange();
    }
}

// Stop animation
function stopAnimation() {
    if (!animationRunning) return;
    animationRunning = false;
    if (animationIntervalId) {
        clearInterval(animationIntervalId);
        animationIntervalId = null;
    }
}

// Spawn egg in the center of the pet container
function spawnEgg(imagePath) {
    if (hasEgg) {
        console.log('Egg already exists!');
        return; // Only one egg at a time
    }
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    hasEgg = true;
    eggClickCount = 0;
    
    // Create egg element
    const egg = document.createElement('img');
    egg.src = imagePath;
    egg.alt = 'Digi Egg';
    egg.className = 'egg-item';
    egg.style.position = 'absolute';
    egg.style.imageRendering = 'pixelated';
    egg.style.pointerEvents = 'auto';
    egg.style.cursor = 'pointer';
    egg.style.zIndex = '100'; // Same as pet
    egg.style.width = '120px';
    egg.style.height = 'auto';
    
    // Center egg in container
    const rect = container.getBoundingClientRect();
    const eggWidth = 120;
    const eggHeight = 120; // Approximate
    const centerX = (rect.width - eggWidth) / 2;
    const centerY = (rect.height - eggHeight) / 2;
    
    egg.style.left = centerX + 'px';
    egg.style.top = centerY + 'px';
    
    // Add click event to egg
    egg.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEggClick();
    });
    
    container.appendChild(egg);
    eggElement = egg;
    
    // Hide pet when egg is present
    hidePet();
    
    console.log('Egg spawned! Click it 10 times to hatch.');
}

// Handle egg click
function handleEggClick() {
    if (!hasEgg || isEggHatched) return;
    
    eggClickCount++;
    console.log(`Egg clicked! (${eggClickCount}/${EGGS_TO_HATCH})`);
    
    // Add a subtle animation to show the click
    if (eggElement) {
        eggElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            if (eggElement) {
                eggElement.style.transform = 'scale(1)';
            }
        }, 100);
    }
    
    // Check if egg should hatch
    if (eggClickCount >= EGGS_TO_HATCH) {
        hatchEgg();
    }
}

// Hatch the egg with evolution animation
function hatchEgg() {
    if (!hasEgg || isEggHatched) return;
    
    console.log('Egg is hatching!');
    isEggHatched = true;
    
    // Remove egg element
    if (eggElement && eggElement.parentNode) {
        eggElement.parentNode.removeChild(eggElement);
    }
    eggElement = null;
    hasEgg = false;
    
        // Notify main process that egg has hatched and send pet type
    try {
        ipcRenderer.send('egg:hatched');
        // Pet type will be sent after random selection in playHatchingAnimation
    } catch (_) {}
    
    // Play evolution animation (similar to evolvePet but for hatching)
    playHatchingAnimation();
}

// Play hatching animation (similar to evolution)
function playHatchingAnimation() {
    if (!pet) return;
    
    // Set evolution flag to prevent other animations
    isEvolving = true;
    
    // Step 0: Randomly select pet type FIRST (before showing pet)
    const petTypes = ['botamon', 'poyomon', 'punimon', 'pitchmon'];
    const randomIndex = Math.floor(Math.random() * petTypes.length);
    currentPetType = petTypes[randomIndex];
    currentEvolutionStage = 1; // Start at base form
    
    console.log(`Pet hatched: ${PET_TYPES[currentPetType].name}`);
    
    // Notify main process of pet type
    try {
        ipcRenderer.send('pet:typeUpdate', currentPetType);
    } catch (_) {}
    
    // Step 1: Create white overlay
    const petWindowContainer = document.querySelector('.pet-window') || document.body;
    const overlay = document.createElement('div');
    overlay.id = 'hatching-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: white;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        pointer-events: none;
        margin: 0;
        padding: 0;
    `;
    document.body.appendChild(overlay);
    
    // Show pet with the selected pet's sprite and white filter
    showPet();
    if (pet) {
        // Set to the selected pet's first walking sprite
        const sprites = getWalkSprites();
        pet.src = sprites[0];
        pet.style.filter = 'brightness(10) saturate(0)'; // Make sprite white
        reloadPetImageData();
        updatePetSize();
    }
    
    // Center pet in container
    const container = document.querySelector('.pet-container');
    if (container && pet) {
        const rect = container.getBoundingClientRect();
        const { width: petWidth, height: petHeight } = getPetDimensions();
        petX = (rect.width - petWidth) / 2;
        petY = (rect.height - petHeight) / 2;
        pet.style.left = petX + 'px';
        pet.style.top = petY + 'px';
    }
    
    // Fade in white overlay
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    // Step 2: After overlay is visible, remove white filter to reveal pet
    setTimeout(() => {
        // Remove white filter from pet to reveal the selected pet
        if (pet) {
            pet.style.filter = 'none';
        }
    }, 500); // Wait 0.5s before revealing pet
    
    // Step 3: After 3 seconds, fade out white overlay
    setTimeout(() => {
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            isEvolving = false;
            
            // Start normal pet behavior
            isWalking = true;
            scheduleNextStateChange();
            chooseNewTarget();
            
            // Start waste spawning system now that pet has hatched
            startWasteSpawning();
            
            console.log('Pet has hatched!');
        }, 500); // Wait for fade out to complete
    }, 3000); // Total 3 seconds
}

function chooseNewTarget() {
    if (!pet) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const petWidth = 120;
    const petHeight = 120;
    
    const maxX = Math.max(0, rect.width - petWidth);
    const maxY = Math.max(0, rect.height - petHeight);
    
    targetX = Math.random() * maxX;
    targetY = Math.random() * maxY;
    
    targetX = Math.max(0, Math.min(targetX, maxX));
    targetY = Math.max(0, Math.min(targetY, maxY));
}

function updateSprite() {
    if (!pet || isEvolving) return; // Don't update sprite during evolution animation
    
    const sleepSprite = getSleepSprite();
    const happinessSprites = getHappinessSprites();
    const exerciseSprites = getExerciseSprites();
    const sprites = getWalkSprites();
    
    // Death takes highest priority - show sleep sprite but no Z's
    if (isDead) {
        if (pet.src !== sleepSprite) {
            pet.src = sleepSprite;
            reloadPetImageData(); // Reload image data for new sprite
        }
        return;
    }
    // Sleeping takes second priority
    if (isSleeping) {
        if (pet.src !== sleepSprite) {
            pet.src = sleepSprite;
            reloadPetImageData(); // Reload image data for new sprite
            // Bubbles continue automatically, no need to update
        }
        return;
    }
    // Exercising takes third priority
    if (isExercising) {
        happinessSpriteIndex = (happinessSpriteIndex + 1) % exerciseSprites.length;
        const newSrc = exerciseSprites[happinessSpriteIndex];
        if (pet.src !== newSrc) {
            pet.src = newSrc;
            reloadPetImageData(); // Reload image data for new sprite
        }
        return;
    }
    // Happiness animation takes priority
    if (isHappy) {
        happinessSpriteIndex = (happinessSpriteIndex + 1) % happinessSprites.length;
        const newSrc = happinessSprites[happinessSpriteIndex];
        if (pet.src !== newSrc) {
            pet.src = newSrc;
            reloadPetImageData(); // Reload image data for new sprite
            // Bubbles continue automatically, no need to update
        }
    } else if (isWalking || isEating) {
        // Animate when walking or eating (chewing)
        currentSpriteIndex = (currentSpriteIndex + 1) % sprites.length;
        const newSrc = sprites[currentSpriteIndex];
        if (pet.src !== newSrc) {
            pet.src = newSrc;
            reloadPetImageData(); // Reload image data for new sprite
            // Bubbles continue automatically, no need to update
        }
    }
}

function updatePosition() {
    if (!pet) return;
    // Don't move when dead, sleeping, exercising, evolving, or egg not hatched
    if (isDead || isSleeping || isExercising || isEvolving || !isEggHatched) return;
    
    // Priority order: medicine (if sick) > medkit > food (if not sick)
    // If sick and medicine is present, move to nearest medicine (highest priority)
    if (isSick && medicineItems.length > 0 && !isEating) {
        // Check if we have a valid current medicine target
        if (!currentMedicineEl || !currentMedicineEl.parentNode) {
            // Current medicine was removed or invalid, find nearest
            moveToNearestMedicine();
        }
        if (currentMedicineEl) {
            isWalking = true;
        }
    }
    // If medkit is present, move to nearest medkit (second priority)
    else if (medkitItems.length > 0 && !isEating) {
        // Check if we have a valid current medkit target
        if (!currentMedkitEl || !currentMedkitEl.parentNode) {
            // Current medkit was removed or invalid, find nearest
            moveToNearestMedkit();
        }
        if (currentMedkitEl) {
            isWalking = true;
        }
    }
    // If food is present and not eating yet, force walking and move to nearest food
    // But don't do this if sick - pet doesn't want to eat when sick
    else if (foodItems.length > 0 && !isEating && hunger < HUNGER_MAX && !isSick) {
        // Check if we have a valid current food target
        if (!currentFoodEl || !currentFoodEl.parentNode) {
            // Current food was removed or invalid, find nearest
            moveToNearestFood();
        }
        if (currentFoodEl) {
            isWalking = true;
        }
    }
    if (!isWalking) return; // Don't move when stopped
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const { width: petWidth, height: petHeight } = getPetDimensions();
    
    // Calculate distance to target
    const dx = targetX - petX;
    const dy = targetY - petY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If close enough to target
    if (distance < 5) { // Increased threshold to ensure pet reaches target
        // If target is medicine, start eating medicine
        if (currentMedicineEl) {
            beginEatingMedicine();
            return;
        }
        // If target is medkit, start eating medkit
        if (currentMedkitEl) {
            beginEatingMedkit();
            return;
        }
        // If target is food, start eating
        if (currentFoodEl) {
            beginEating();
            return;
        }
        // Otherwise, choose a new random target
        chooseNewTarget();
        return;
    }
    
    // Move towards target
    if (distance > 0) {
        // Move slower when sick
        const currentSpeed = isSick ? walkSpeed * 0.5 : walkSpeed;
        petX += (dx / distance) * currentSpeed;
        petY += (dy / distance) * currentSpeed;
    }
    
    // Keep within bounds
    const maxX = Math.max(0, rect.width - petWidth);
    const maxY = Math.max(0, rect.height - petHeight);
    
    petX = Math.max(0, Math.min(petX, maxX));
    petY = Math.max(0, Math.min(petY, maxY));
    
    // Update DOM
    pet.style.left = petX + 'px';
    pet.style.top = petY + 'px';
}

// Schedule next state change (walk/stop)
function scheduleNextStateChange() {
    const currentTime = Date.now();
    
    if (isWalking) {
        // Schedule stop - random duration between min and max
        const stopDuration = minStopDuration + Math.random() * (maxStopDuration - minStopDuration);
        nextStateChangeTime = currentTime + stopDuration;
    } else {
        // Schedule walk - random duration between min and max
        const walkDuration = minWalkDuration + Math.random() * (maxWalkDuration - minWalkDuration);
        nextStateChangeTime = currentTime + walkDuration;
        // Choose a new target when starting to walk
        chooseNewTarget();
    }
}

// Check and handle state changes
function checkStateChange(currentTime) {
    // Don't change state when dead
    if (isDead) return;
    // Disable random state changes while eating, sleeping, exercising, during happiness animation, when food is present, when medicine is present, or when medkit is present
    if (isEating || isSleeping || isExercising || isHappy || 
        (foodItems.length > 0 && hunger < HUNGER_MAX && !isSick) || 
        (medicineItems.length > 0 && isSick) ||
        (medkitItems.length > 0)) return;
    if (currentTime >= nextStateChangeTime) {
        isWalking = !isWalking;
        scheduleNextStateChange();
        
        if (isWalking) {
            console.log('Pet started walking');
            chooseNewTarget();
        } else {
            console.log('Pet stopped walking');
            // Keep the first sprite when stopped
            if (pet) {
                const sprites = getWalkSprites();
                pet.src = sprites[0];
            }
        }
    }
}

function animate() {
    if (!animationRunning) return;
    
    // Don't animate if egg hasn't hatched
    if (!isEggHatched) return;
    
    const currentTime = Date.now();
    
    // Check if we should change walking state
    checkStateChange(currentTime);
    
    // Update sprite (when walking, eating, happy, or exercising)
    if (isWalking || isEating || isHappy || isExercising) {
        if (!lastSpriteUpdate) {
            lastSpriteUpdate = currentTime;
        }
        if (currentTime - lastSpriteUpdate >= spriteUpdateInterval) {
            updateSprite();
            lastSpriteUpdate = currentTime;
        }
    }
    
    // Update position (only when walking)
    updatePosition();
    
    // Update Z positions if sleeping
    if (isSleeping) {
        updateSleepZPositions();
    }
}

function startAnimation() {
    if (animationRunning) return;
    
    console.log('Starting animation...');
    animationRunning = true;
    lastSpriteUpdate = 0;
    
    // Use setInterval instead of requestAnimationFrame for continuous animation
    // This ensures animation continues even when window is minimized or hidden
    animationIntervalId = setInterval(animate, 16); // ~60fps
}

function beginEating() {
    // Don't eat if dead, sick, sleeping, or exercising
    if (isDead || isSick || isSleeping || isExercising) {
        currentFoodEl = null;
        return;
    }
    
    // Verify food still exists and is in the food items array
    if (!currentFoodEl || !currentFoodEl.parentNode || isEating) {
        // Food was removed or invalid, find nearest food if available
        if (foodItems.length > 0 && hunger < HUNGER_MAX && !isSick) {
            moveToNearestFood();
        }
        return;
    }
    
    // Verify this food is still in our food items array
    if (!foodItems.includes(currentFoodEl)) {
        // Food was removed from array but element still exists, find nearest
        if (foodItems.length > 0 && hunger < HUNGER_MAX && !isSick) {
            moveToNearestFood();
        }
        return;
    }
    
    // Arrived at food: stop moving and chew
    isWalking = false;
    isEating = true;
    // Ensure pet is visually facing/eating (start chewing animation via animate loop)
    if (eatingTimeoutId) {
        clearTimeout(eatingTimeoutId);
        eatingTimeoutId = null;
    }
    eatingTimeoutId = setTimeout(() => {
        finishEating();
    }, 5000); // 5 seconds
}

function finishEating() {
    // Remove the food element that was just eaten
    if (currentFoodEl && currentFoodEl.parentNode) {
        currentFoodEl.parentNode.removeChild(currentFoodEl);
    }
    
    // Get food type and effects
    const foodType = currentFoodEl ? currentFoodEl.dataset.foodType : null;
    const foodData = foodType && FOOD_TYPES[foodType] ? FOOD_TYPES[foodType] : null;
    
    // Remove from food items array
    foodItems = foodItems.filter(food => food !== currentFoodEl);
    
    currentFoodEl = null;
    isEating = false;
    
    // Apply food effects
    if (foodData) {
        // Increase hunger
        if (foodData.hunger > 0) {
            let hungerIncrease = foodData.hunger;
            
            // Apply pudding bonus if active (30% increase, rounded up)
            if (isPuddingActive) {
                const bonus = hungerIncrease * 0.3;
                hungerIncrease = hungerIncrease + Math.ceil(bonus);
                console.log(`Pudding bonus applied! Hunger increase: ${foodData.hunger} -> ${hungerIncrease} (+${Math.ceil(bonus)})`);
            }
            
            setHunger(hunger + hungerIncrease);
        }
        // Increase happiness
        if (foodData.happiness > 0) {
            let happinessIncrease = foodData.happiness;
            
            // Apply bubble wand bonus if active (30% increase, rounded up)
            if (isBubbleWandActive) {
                const bonus = happinessIncrease * 0.3;
                happinessIncrease = happinessIncrease + Math.ceil(bonus);
                console.log(`Bubble Wand bonus applied! Happiness increase: ${foodData.happiness} -> ${happinessIncrease} (+${Math.ceil(bonus)})`);
            }
            
            setHappiness(happiness + happinessIncrease);
        }
        // Increase rest
        if (foodData.rest > 0) {
            let restIncrease = foodData.rest;
            
            // Apply chimes bonus if active (30% increase, rounded up)
            if (isChimesActive) {
                const bonus = restIncrease * 0.3;
                restIncrease = restIncrease + Math.ceil(bonus);
                console.log(`Chimes bonus applied! Rest increase: ${foodData.rest} -> ${restIncrease} (+${Math.ceil(bonus)})`);
            }
            
            setRest(rest + restIncrease);
        }
    } else {
        // Fallback: default hunger increase (for backwards compatibility)
        let hungerIncrease = 5;
        
        // Apply pudding bonus if active (30% increase, rounded up)
        if (isPuddingActive) {
            const bonus = hungerIncrease * 0.3;
            hungerIncrease = hungerIncrease + Math.ceil(bonus);
            console.log(`Pudding bonus applied! Hunger increase: 5 -> ${hungerIncrease} (+${Math.ceil(bonus)})`);
        }
        
        setHunger(hunger + hungerIncrease);
    }
    
    // Gain experience from eating
    addExperience(EXPERIENCE_GAIN_EAT);
    
    // Check if there are more food items available
    if (foodItems.length > 0 && hunger < HUNGER_MAX) {
        // More food available - move to nearest food after happiness animation
        // Store this info to use after animation completes
        const hasMoreFood = true;
        playHappinessAnimation(hasMoreFood);
    } else {
        // No more food - play happiness animation and resume normal walking
        playHappinessAnimation(false);
    }
}

function playHappinessAnimation(hasMoreFood = false) {
    if (!pet) return;
    isHappy = true;
    isWalking = false;
    happinessSpriteIndex = 0; // Start with first sprite (index 0)
    const happinessSprites = getHappinessSprites();
    pet.src = happinessSprites[happinessSpriteIndex];
    
    // Each cycle is 1->3->1 (2 sprite switches), so 3 cycles = 6 switches total
    // The animation loop will handle the sprite updates automatically
    const totalSwitches = 6; // 3 cycles * 2 switches per cycle
    const totalDuration = totalSwitches * spriteUpdateInterval;
    
    setTimeout(() => {
        // Animation complete - 3 cycles finished
        isHappy = false;
        
        if (hasMoreFood && foodItems.length > 0 && hunger < HUNGER_MAX) {
            // More food available - move to nearest food
            moveToNearestFood();
        } else {
            // No more food - resume normal walking
            isWalking = true;
            scheduleNextStateChange();
            chooseNewTarget();
        }
        
        // Reset to first walking sprite
        if (pet) {
            currentSpriteIndex = 0;
            const sprites = getWalkSprites();
            pet.src = sprites[0];
        }
    }, totalDuration);
}

function setHunger(value) {
    hunger = Math.max(HUNGER_MIN, Math.min(HUNGER_MAX, value));
    // Update stat bar directly
    updateStatBar('hunger', hunger, HUNGER_MAX);
    // Notify main to store the update
    try {
        ipcRenderer.send('stats:update', { key: 'hunger', value: hunger, max: HUNGER_MAX });
    } catch (_) {}
}

function setRest(value) {
    rest = Math.max(REST_MIN, Math.min(REST_MAX, value));
    // Update stat bar directly
    updateStatBar('rest', rest, REST_MAX);
    // Notify main to store the update
    try {
        ipcRenderer.send('stats:update', { key: 'rest', value: rest, max: REST_MAX });
    } catch (_) {}
    
    // Auto-wake is now handled in main.js when rest reaches 100
}

function setHappiness(value) {
    happiness = Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, value));
    // Update stat bar directly
    updateStatBar('happiness', happiness, HAPPINESS_MAX);
    // Notify main to store the update
    try {
        ipcRenderer.send('stats:update', { key: 'happiness', value: happiness, max: HAPPINESS_MAX });
    } catch (_) {}
}

function setHealth(value) {
    const oldHealth = health;
    health = Math.max(HEALTH_MIN, Math.min(HEALTH_MAX, value));
    // Update stat bar directly
    updateStatBar('health', health, HEALTH_MAX);
    // Notify main to store the update
    // This ensures health persists even when window is minimized/unfocused
    try {
        ipcRenderer.send('stats:update', { key: 'health', value: health, max: HEALTH_MAX });
    } catch (_) {}
    
    // Check if pet died (health reached 0)
    if (health === 0 && oldHealth > 0 && !isDead) {
        triggerDeath();
    }
    // Check if pet was revived (health > 0 after being dead)
    else if (health > 0 && isDead) {
        revivePet();
    }
}

// Trigger death when health reaches 0
function triggerDeath() {
    if (isDead) return;
    
    isDead = true;
    
    // Stop all movement and actions
    isWalking = false;
    isEating = false;
    isHappy = false;
    
    // Stop exercising if exercising
    if (isExercising) {
        stopExercising();
    }
    
    // Clear any targets
    currentFoodEl = null;
    currentMedicineEl = null;
    currentMedkitEl = null;
    
    // Stop bubbles if sick
    stopSicknessBubbles();
    
    // Change to sleep sprite (death sprite)
    if (pet) {
        const sleepSprite = getSleepSprite();
        pet.src = sleepSprite;
        // Don't show Z's for death
        // Make sure Z's are removed if they exist
        removeSleepZs();
    }
    
    // Notify main process
    try {
        ipcRenderer.send('pet:death', true);
    } catch (_) {}
    
    console.log('Pet has died!');
}

// Revive pet (for future implementation)
function revivePet() {
    if (!isDead) return;
    
    isDead = false;
    
    // Reset to normal sprite
    if (pet && !isSleeping) {
        currentSpriteIndex = 0;
        const sprites = getWalkSprites();
        pet.src = sprites[0];
        updateSickAppearance(); // Reapply bubbles if sick
    }
    
    // Resume normal behavior
    isWalking = true;
    scheduleNextStateChange();
    chooseNewTarget();
    
    // Notify main process
    try {
        ipcRenderer.send('pet:death', false);
    } catch (_) {}
    
    console.log('Pet has been revived!');
}

// Update pet appearance when sick (green bubbles)
function updateSickAppearance() {
    if (!pet) return;
    if (isSick) {
        // Start spawning green bubbles
        startSicknessBubbles();
    } else {
        // Stop bubbles and remove them
        stopSicknessBubbles();
        pet.style.filter = 'none';
    }
}

// Start spawning green bubbles when sick
function startSicknessBubbles() {
    // Clear any existing interval
    if (bubbleSpawnIntervalId) {
        clearInterval(bubbleSpawnIntervalId);
    }
    
    // Don't start if not sick
    if (!isSick) return;
    
    // Spawn a bubble every 800ms
    bubbleSpawnIntervalId = setInterval(() => {
        if (!isSick || !pet) {
            stopSicknessBubbles();
            return;
        }
        createSicknessBubble();
    }, 800);
}

// Stop spawning bubbles and remove existing ones
function stopSicknessBubbles() {
    // Clear spawn interval
    if (bubbleSpawnIntervalId) {
        clearInterval(bubbleSpawnIntervalId);
        bubbleSpawnIntervalId = null;
    }
    
    // Remove all bubbles
    sicknessBubbles.forEach(bubble => {
        if (bubble.parentNode) {
            bubble.parentNode.removeChild(bubble);
        }
    });
    sicknessBubbles = [];
}

// Find a random opaque pixel position on the sprite
function findRandomOpaquePixel() {
    if (!pet || !petImageLoaded || !petImageData) {
        // Fallback: return center of pet if image data not loaded
        const petWidth = 120;
        const petHeight = 120;
        return {
            x: petX + petWidth / 2,
            y: petY + petHeight / 2
        };
    }
    
    const petRect = pet.getBoundingClientRect();
    const imageWidth = petImageData.width;
    const imageHeight = petImageData.height;
    const displayWidth = petRect.width;
    const displayHeight = petRect.height;
    
    // Try up to 50 random positions to find an opaque pixel
    for (let i = 0; i < 50; i++) {
        const randomImageX = Math.floor(Math.random() * imageWidth);
        const randomImageY = Math.floor(Math.random() * imageHeight);
        
        // Get pixel data (RGBA format)
        const pixelIndex = (randomImageY * imageWidth + randomImageX) * 4;
        const alpha = petImageData.data[pixelIndex + 3];
        
        // If pixel is opaque, convert to display coordinates
        if (alpha > 0) {
            const displayX = petX + (randomImageX / imageWidth) * displayWidth;
            const displayY = petY + (randomImageY / imageHeight) * displayHeight;
            return { x: displayX, y: displayY };
        }
    }
    
    // If no opaque pixel found after 50 tries, return center as fallback
    const petWidth = 120;
    const petHeight = 120;
    return {
        x: petX + petWidth / 2,
        y: petY + petHeight / 2
    };
}

// Create a single purple bubble that floats up from an opaque pixel of the pet
function createSicknessBubble() {
    if (!pet) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    // Find a random opaque pixel position
    const bubblePos = findRandomOpaquePixel();
    
    // Create bubble element
    const bubble = document.createElement('div');
    bubble.className = 'sickness-bubble';
    container.appendChild(bubble);
    sicknessBubbles.push(bubble);
    
    // Position bubble at the opaque pixel location
    bubble.style.left = bubblePos.x + 'px';
    bubble.style.top = bubblePos.y + 'px';
    
    // Add random horizontal drift for more natural movement (-15 to +15 pixels)
    const horizontalDrift = (Math.random() - 0.5) * 30;
    bubble.style.setProperty('--random-offset', horizontalDrift + 'px');
    
    // Remove bubble after animation completes (2.5 seconds)
    setTimeout(() => {
        if (bubble.parentNode) {
            bubble.parentNode.removeChild(bubble);
            // Remove from array
            sicknessBubbles = sicknessBubbles.filter(b => b !== bubble);
        }
    }, 2500);
}

// Start health decay when sick (notifies main process)
function startHealthDecay() {
    // Notify main process that pet is sick
    // Health decay is now handled in main.js so it persists even when windows are minimized
    try {
        ipcRenderer.send('pet:sick', true);
    } catch (_) {}
}

// Stop health decay (notifies main process)
function stopHealthDecay() {
    // Notify main process that pet is cured
    // Health decay is now handled in main.js so it persists even when windows are minimized
    try {
        ipcRenderer.send('pet:sick', false);
    } catch (_) {}
}

// Cure sickness
function cureSickness() {
    if (!isSick) return;
    
    isSick = false;
    stopHealthDecay(); // Notifies main.js to stop health decay
    stopSicknessBubbles(); // Stop bubbles
    updateSickAppearance();
    console.log('Pet has been cured!');
}

// Add experience and check for evolution
function addExperience(amount) {
    if (isDead || isEvolving) return; // Can't gain experience when dead or evolving
    
    let experienceGain = amount;
    
    // Apply paddle bonus if active (30% increase, rounded up)
    if (isPaddleActive) {
        const bonus = experienceGain * 0.3;
        experienceGain = experienceGain + Math.ceil(bonus);
        console.log(`Paddle bonus applied! Experience gain: ${amount} -> ${experienceGain} (+${Math.ceil(bonus)})`);
    }
    
    const oldExperience = experience;
    experience = Math.min(EXPERIENCE_MAX, experience + experienceGain);
    
    // Notify main process to store experience
    try {
        ipcRenderer.send('stats:update', { key: 'experience', value: experience, max: EXPERIENCE_MAX });
    } catch (_) {}
    
    // Check if pet should evolve
    if (experience >= EXPERIENCE_MAX && oldExperience < EXPERIENCE_MAX && !isEvolving) {
        evolvePet();
    }
}

// Start passive experience gain (experience just for existing)
function startPassiveExperienceGain() {
    if (experienceTimeIntervalId) {
        clearInterval(experienceTimeIntervalId);
    }
    
    // Gain 10 experience every 3 minutes (180000ms)
    experienceTimeIntervalId = setInterval(() => {
        if (!isDead && !isEvolving && isEggHatched) {
            addExperience(EXPERIENCE_GAIN_TIME_AMOUNT);
        }
    }, EXPERIENCE_GAIN_TIME_INTERVAL);
}

// Stop passive experience gain
function stopPassiveExperienceGain() {
    if (experienceTimeIntervalId) {
        clearInterval(experienceTimeIntervalId);
        experienceTimeIntervalId = null;
    }
}

// Evolve pet to next stage with animation
function evolvePet() {
    if (isDead || isEvolving) return; // Can't evolve when dead or already evolving
    
	// Determine current resolved form and whether it can evolve
	const resolvedType = getResolvedTypeForStage(currentPetType, currentEvolutionStage);
	const resolvedData = PET_TYPES[resolvedType];
	if (!resolvedData || !resolvedData.canEvolve) {
		console.log(`${resolvedData ? resolvedData.name : 'Pet'} cannot evolve!`);
		return;
	}

	// Check if already at max evolution stage (cap at 4)
	if (currentEvolutionStage >= 4) {
		console.log('Pet is already at max evolution!');
		return;
	}
    
    // Stop exercising if exercising (exercise should not continue during evolution)
    if (isExercising) {
        stopExercising();
    }
    
	// Evolve to next stage
	const nextStage = currentEvolutionStage + 1;
    
    // Start evolution animation
    isEvolving = true;
    
    // Step 1: Make pet sprite white
    if (pet) {
        pet.style.filter = 'brightness(10) saturate(0)'; // Make sprite white
    }
    
    // Step 2: Create white overlay that covers the whole screen
    // Get the pet window container to ensure overlay covers entire window
    const petWindowContainer = document.querySelector('.pet-window') || document.body;
    const overlay = document.createElement('div');
    overlay.id = 'evolution-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: white;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        pointer-events: none;
        margin: 0;
        padding: 0;
    `;
    document.body.appendChild(overlay);
    
    // Stop all animations and movements during evolution
    const wasWalking = isWalking;
    const wasHappy = isHappy;
    isWalking = false;
    isHappy = false;
    
    // Fade in white overlay
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    // Step 3: After overlay is visible, change sprites during the 3 seconds
    setTimeout(() => {
		// Evolve to next stage
        currentEvolutionStage = nextStage;

		// Update next experience threshold
		if (currentEvolutionStage === 2) EXPERIENCE_MAX = 450;
		else if (currentEvolutionStage === 3) EXPERIENCE_MAX = 650;

		// Log new form name
		const newResolvedType = getResolvedTypeForStage(currentPetType, currentEvolutionStage);
		const newData = PET_TYPES[newResolvedType];
		console.log(`${resolvedData.name} evolved to ${newData ? newData.name : 'Next Form'}!`);
        
        // Reset experience to 0
        experience = 0;
        try {
            ipcRenderer.send('stats:update', { key: 'experience', value: 0, max: EXPERIENCE_MAX });
        } catch (_) {}
        
        // Reload all sprites to use evolved form (Koromon)
        const sprites = getWalkSprites();
        const sleepSprite = getSleepSprite();
        
        // Update current sprite based on state
        if (isSleeping || isDead) {
            pet.src = sleepSprite;
        } else if (isHappy) {
            const happinessSprites = getHappinessSprites();
            pet.src = happinessSprites[happinessSpriteIndex];
        } else {
            pet.src = sprites[currentSpriteIndex];
        }
        
        // Remove white filter from pet
        if (pet) {
            pet.style.filter = 'none';
        }
        
        // Reload image data for new sprite
        reloadPetImageData();
        
        // Update pet size based on new evolution stage
        updatePetSize();
        
        // Notify main process of evolution
        try {
            ipcRenderer.send('pet:evolved', currentEvolutionStage);
        } catch (_) {}
    }, 500); // Wait 0.5s before changing sprites (halfway through animation)
    
    // Step 4: After 3 seconds, fade out white overlay and remove it
    setTimeout(() => {
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            isEvolving = false;
            
            // Resume normal behavior after evolution
            if (!isDead && !isSleeping) {
                // Restore previous state if needed, or start walking
                if (!wasHappy && !wasWalking) {
                    isWalking = true;
                    scheduleNextStateChange();
                    chooseNewTarget();
                } else if (wasWalking) {
                    isWalking = true;
                    scheduleNextStateChange();
                    chooseNewTarget();
                }
            }
        }, 500); // Wait for fade out to complete
    }, 3000); // Total 3 seconds
}

// Handle pet click for petting
function handlePetClick() {
    if (isDead || isSleeping || isExercising) return; // Can't pet when dead, sleeping, or exercising
    
    // Increment click count
    petClickCount++;
    
    // Gain experience from petting
    addExperience(EXPERIENCE_GAIN_PET);
    
    // Play happiness animation (if not already playing and not eating)
    if (!isHappy && !isEating) {
        playHappinessAnimation(false);
    }
    
    // Check if we've reached 5 clicks
    if (petClickCount >= PETS_FOR_HAPPINESS) {
        // Increase happiness by 1
        let happinessIncrease = 1;
        
        // Apply bubble wand bonus if active (30% increase, rounded up)
        if (isBubbleWandActive) {
            const bonus = happinessIncrease * 0.3;
            happinessIncrease = happinessIncrease + Math.ceil(bonus);
            console.log(`Bubble Wand bonus applied! Happiness increase: 1 -> ${happinessIncrease} (+${Math.ceil(bonus)})`);
        }
        
        setHappiness(happiness + happinessIncrease);
        // Reset click counter
        petClickCount = 0;
    }
}

// Note: Hunger decay is now handled in main.js for persistence
// This function is kept for backward compatibility but does nothing
// The main process handles hunger decay and sends updates via IPC
function startHungerDecay() {
    // Hunger decay is now handled in main.js so it works even when windows are closed
    // The main process sends 'stats:update' messages which are handled in the window load event
    console.log('Hunger decay is handled by main process');
}

// Handle resize
window.addEventListener('resize', () => {
    if (!pet) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const petWidth = 120;
    const petHeight = 120;
    
    const maxX = Math.max(0, rect.width - petWidth);
    const maxY = Math.max(0, rect.height - petHeight);
    
    petX = Math.max(0, Math.min(petX, maxX));
    petY = Math.max(0, Math.min(petY, maxY));
    
    pet.style.left = petX + 'px';
    pet.style.top = petY + 'px';
    
    // Update Z positions if sleeping
    if (isSleeping) {
        updateSleepZPositions();
    }
    
    if (targetX > maxX || targetY > maxY) {
        chooseNewTarget();
    }
});

// Create sleeping Z's
function createSleepZs() {
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    // Remove any existing Z's first
    removeSleepZs();
    
    // Create 3 Z's
    for (let i = 0; i < 3; i++) {
        const z = document.createElement('div');
        z.className = 'sleep-z';
        z.textContent = 'Z';
        container.appendChild(z);
        sleepZs.push(z);
    }
    
    // Update their positions
    updateSleepZPositions();
    
    // Show them after a brief delay for smooth appearance
    setTimeout(() => {
        sleepZs.forEach(z => z.classList.add('show'));
    }, 50);
}

// Update Z positions to be above pet's head
function updateSleepZPositions() {
    if (!pet || sleepZs.length === 0) return;
    
    const petRect = pet.getBoundingClientRect();
    const container = document.querySelector('.pet-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    
    // Position Z's above the pet's head
    // Pet is 120px wide, so center Z's around the top-center of the pet
    const petWidth = 120;
    const zBaseX = petX + (petWidth / 2); // Center of pet
    const zBaseY = petY; // Top of pet
    
    sleepZs.forEach((z, index) => {
        // Offset each Z slightly horizontally and vertically
        const offsetX = (index - 1) * 15; // -15, 0, 15 for spacing
        const offsetY = 5 + (index * 8); // Position them starting at top of pet, stacked slightly
        
        z.style.left = (zBaseX + offsetX) + 'px';
        z.style.top = (zBaseY + offsetY) + 'px';
    });
}

// Remove sleeping Z's
function removeSleepZs() {
    sleepZs.forEach(z => {
        if (z.parentNode) {
            z.parentNode.removeChild(z);
        }
    });
    sleepZs = [];
}

// Start sleeping
function startSleeping() {
    if (!pet || isSleeping || isDead) return; // Can't sleep when dead
    
    isSleeping = true;
    isWalking = false;
    isHappy = false;
    isEating = false;
    
    // Change sprite to sleep sprite
    const sleepSprite = getSleepSprite();
    pet.src = sleepSprite;
    updateSickAppearance(); // Update bubbles if sick
    
    // Create sleeping Z's (only if not dead)
    if (!isDead) {
        createSleepZs();
    }
    
    // Rest increment is now handled in main.js for persistence
    // Notify main process that pet is sleeping (to update menu)
    try {
        ipcRenderer.send('pet:sleeping', true);
    } catch (_) {}
}

// Stop sleeping
function stopSleeping() {
    if (!pet || !isSleeping) return;
    // Don't wake up if dead - pet stays in death state (sleep sprite)
    if (isDead) return;
    
    isSleeping = false;
    
    // Remove sleeping Z's
    removeSleepZs();
    
    // Rest increment is now handled in main.js for persistence
    // Reset to normal sprite
    currentSpriteIndex = 0;
    const sprites = getWalkSprites();
    pet.src = sprites[0];
    updateSickAppearance(); // Update bubbles if sick
    
    // Resume normal behavior
    // Priority: medicine (if sick) > medkit > normal walking
    if (isSick && medicineItems.length > 0) {
        moveToNearestMedicine();
    } else if (medkitItems.length > 0) {
        moveToNearestMedkit();
    } else {
        isWalking = true;
        scheduleNextStateChange();
        chooseNewTarget();
    }
    
    // Notify main process that pet is awake (to update menu)
    try {
        ipcRenderer.send('pet:sleeping', false);
    } catch (_) {}
}

// Rest increment is now handled in main.js for persistence
// This ensures rest increases even when the window is minimized or unfocused

// Waste spawning system
const WASTE_SPAWN_INTERVAL = 180000; // 3 minutes in milliseconds
const wasteSpritePath = 'sprites/items/waste.png';

// Start waste spawning system - pet leaves waste every 3 minutes
function startWasteSpawning() {
    // Clear any existing interval
    if (wasteSpawnIntervalId) {
        clearInterval(wasteSpawnIntervalId);
    }
    
    // Don't start if egg hasn't hatched
    if (!isEggHatched) {
        return;
    }
    
    // Spawn waste every 3 minutes
    wasteSpawnIntervalId = setInterval(() => {
        // Only spawn waste if egg is hatched
        if (isEggHatched) {
            spawnWaste();
        }
    }, WASTE_SPAWN_INTERVAL);
}

// Spawn waste at pet's current position
function spawnWaste() {
    if (!pet) return;
    
    // Don't spawn waste if pet is dead or sleeping
    if (isDead || isSleeping) {
        return;
    }
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    // Create waste element
    const waste = document.createElement('img');
    waste.src = wasteSpritePath;
    waste.alt = 'Waste';
    waste.className = 'waste-item';
    waste.style.position = 'absolute';
    waste.style.imageRendering = 'pixelated';
    waste.style.pointerEvents = 'auto';
    waste.style.cursor = 'pointer';
    waste.style.zIndex = '85'; // Below pet (100) and food (90)
    waste.style.width = '48px';
    waste.style.height = 'auto';
    
    // Spawn at pet's current position (center of pet)
    const petWidth = 120;
    const petHeight = 120;
    const wasteWidth = 48;
    const wasteHeight = 48;
    
    // Center waste on pet's position
    const wasteX = petX + (petWidth / 2) - (wasteWidth / 2);
    const wasteY = petY + (petHeight / 2) - (wasteHeight / 2);
    
    // Keep within container bounds
    const rect = container.getBoundingClientRect();
    const finalX = Math.max(0, Math.min(wasteX, rect.width - wasteWidth));
    const finalY = Math.max(0, Math.min(wasteY, rect.height - wasteHeight));
    
    waste.style.left = finalX + 'px';
    waste.style.top = finalY + 'px';
    
    // Add click event to remove waste (cleaning)
    waste.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to pet
        removeWasteItem(waste);
    });
    
    container.appendChild(waste);
    
    // Add to waste items array
    wasteItems.push(waste);
    wasteCount++;
    
    // Notify main process of waste count update
    sendWasteCountUpdate();
    
    console.log('Waste spawned. Total waste count:', wasteCount);
}

// Remove a waste item when clicked (player cleans it)
function removeWasteItem(wasteItem) {
    if (!wasteItem || !wasteItem.parentNode) return;
    
    // Remove from DOM
    wasteItem.parentNode.removeChild(wasteItem);
    
    // Remove from waste items array
    wasteItems = wasteItems.filter(waste => waste !== wasteItem);
    wasteCount = Math.max(0, wasteCount - 1);
    
    // Notify main process of waste count update
    sendWasteCountUpdate();
    
    console.log('Waste cleaned. Remaining waste count:', wasteCount);
}

// Send waste count update to main process
function sendWasteCountUpdate() {
    try {
        ipcRenderer.send('waste:updateCount', wasteCount);
    } catch (_) {}
}

// Exercise system
// Start exercising
function startExercising() {
    if (!pet || isExercising || isDead || isSleeping) return;
    
    isExercising = true;
    isWalking = false;
    isHappy = false;
    isEating = false;
    
    // Clear any food/medicine targets
    currentFoodEl = null;
    currentMedicineEl = null;
    currentMedkitEl = null;
    
    // Set sprite to first exercise sprite (sprite 1)
    const exerciseSprites = getExerciseSprites();
    happinessSpriteIndex = 0;
    pet.src = exerciseSprites[happinessSpriteIndex];
    reloadPetImageData();
    
    // Start spawning sweat particles
    startSweatParticles();
    
    // Notify main process that pet is exercising
    try {
        ipcRenderer.send('pet:exercising', true);
    } catch (_) {}
    
    console.log('Pet started exercising!');
}

// Stop exercising
function stopExercising() {
    if (!pet || !isExercising) return;
    
    isExercising = false;
    
    // Stop sweat particles
    stopSweatParticles();
    
    // Reset to normal sprite
    currentSpriteIndex = 0;
    const sprites = getWalkSprites();
    pet.src = sprites[0];
    reloadPetImageData();
    
    // Resume normal behavior
    // Priority: medicine (if sick) > medkit > food > normal walking
    if (isSick && medicineItems.length > 0) {
        moveToNearestMedicine();
    } else if (medkitItems.length > 0) {
        moveToNearestMedkit();
    } else if (foodItems.length > 0 && hunger < HUNGER_MAX && !isSick) {
        moveToNearestFood();
    } else {
        isWalking = true;
        scheduleNextStateChange();
        chooseNewTarget();
    }
    
    // Notify main process that pet stopped exercising
    try {
        ipcRenderer.send('pet:exercising', false);
    } catch (_) {}
    
    console.log('Pet stopped exercising!');
}

// Start spawning sweat particles when exercising
function startSweatParticles() {
    // Clear any existing interval
    if (sweatSpawnIntervalId) {
        clearInterval(sweatSpawnIntervalId);
    }
    
    // Don't start if not exercising
    if (!isExercising) return;
    
    // Spawn a sweat particle every 600ms (slightly faster than sickness bubbles)
    sweatSpawnIntervalId = setInterval(() => {
        if (!isExercising || !pet) {
            stopSweatParticles();
            return;
        }
        createSweatParticle();
    }, 600);
}

// Stop spawning sweat particles and remove existing ones
function stopSweatParticles() {
    // Clear spawn interval
    if (sweatSpawnIntervalId) {
        clearInterval(sweatSpawnIntervalId);
        sweatSpawnIntervalId = null;
    }
    
    // Remove all sweat particles
    sweatParticles.forEach(particle => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    });
    sweatParticles = [];
}

// Create a single sweat particle that drips down from the pet
function createSweatParticle() {
    if (!pet) return;
    
    const container = document.querySelector('.pet-container');
    if (!container) return;
    
    // Find a random opaque pixel position on the upper part of the pet (where sweat would come from)
    const sweatPos = findRandomOpaquePixelForSweat();
    
    // Create sweat particle element
    const particle = document.createElement('div');
    particle.className = 'sweat-particle';
    container.appendChild(particle);
    sweatParticles.push(particle);
    
    // Position particle at the opaque pixel location
    particle.style.left = sweatPos.x + 'px';
    particle.style.top = sweatPos.y + 'px';
    
    // Add random horizontal drift for more natural movement (-8 to +8 pixels)
    const horizontalDrift = (Math.random() - 0.5) * 16;
    particle.style.setProperty('--random-offset', horizontalDrift + 'px');
    
    // Remove particle after animation completes (2 seconds)
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
            // Remove from array
            sweatParticles = sweatParticles.filter(p => p !== particle);
        }
    }, 2000);
}

// Find a random opaque pixel position on the upper part of the sprite (for sweat)
function findRandomOpaquePixelForSweat() {
    if (!pet || !petImageLoaded || !petImageData) {
        // Fallback: return upper center of pet if image data not loaded
        const { width: petWidth, height: petHeight } = getPetDimensions();
        return {
            x: petX + petWidth / 2 + (Math.random() - 0.5) * 20,
            y: petY + petHeight * 0.2 + Math.random() * petHeight * 0.3
        };
    }
    
    const imageWidth = petImageData.width;
    const imageHeight = petImageData.height;
    const displayWidth = pet.getBoundingClientRect().width;
    const displayHeight = pet.getBoundingClientRect().height;
    
    // Focus on upper 40% of the sprite (where sweat would come from head/upper body)
    const upperPortion = 0.4;
    
    // Try up to 50 random positions to find an opaque pixel in the upper portion
    for (let i = 0; i < 50; i++) {
        const randomImageX = Math.floor(Math.random() * imageWidth);
        const randomImageY = Math.floor(Math.random() * imageHeight * upperPortion); // Only upper portion
        
        // Get pixel data (RGBA format)
        const pixelIndex = (randomImageY * imageWidth + randomImageX) * 4;
        const alpha = petImageData.data[pixelIndex + 3];
        
        // If pixel is opaque, convert to display coordinates
        if (alpha > 0) {
            const displayX = petX + (randomImageX / imageWidth) * displayWidth;
            const displayY = petY + (randomImageY / imageHeight) * displayHeight;
            return { x: displayX, y: displayY };
        }
    }
    
    // If no opaque pixel found after 50 tries, return upper center as fallback
    const { width: petWidth, height: petHeight } = getPetDimensions();
    return {
        x: petX + petWidth / 2 + (Math.random() - 0.5) * 20,
        y: petY + petHeight * 0.2 + Math.random() * petHeight * 0.3
    };
}
