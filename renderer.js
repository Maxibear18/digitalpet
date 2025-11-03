const { ipcRenderer } = require('electron');

// Sprite paths for walking cycle
const sprites = [
    'sprites/botamon.png',
    'sprites/botamon 2.png'
];
// Sprite paths for happiness animation (cycles between 1 and 3)
const happinessSprites = [
    'sprites/botamon.png',
    'sprites/botamon 3.png'
];
// Sleep sprite
const sleepSprite = 'sprites/botamon 4.png';
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
let currentFoodEl = null; // Currently targeted food item
let foodItems = []; // Array of all food items on screen
let eatingTimeoutId = null;
let happinessSpriteIndex = 0; // Current sprite in happiness animation
let sleepZs = []; // Array of sleeping Z elements

// Hunger (0-100)
let hunger = 50;
const HUNGER_MAX = 100;
const HUNGER_MIN = 0;
const HUNGER_DECAY_INTERVAL = 150000; // 2.5 minutes in milliseconds
const HUNGER_DECAY_AMOUNT = 10; // Amount hunger decreases by
let hungerDecayIntervalId = null;

// Rest (0-100)
let rest = 50;
const REST_MAX = 100;
const REST_MIN = 0;
const REST_INCREMENT_INTERVAL = 60000; // 1 minute in milliseconds
const REST_INCREMENT_AMOUNT = 5; // Amount rest increases by while sleeping
let restIncrementIntervalId = null;
let lastSpriteUpdate = 0;
let nextStateChangeTime = 0;
const spriteUpdateInterval = 300; // milliseconds
const minWalkDuration = 2000; // Minimum 2 seconds walking
const maxWalkDuration = 6000; // Maximum 6 seconds walking
const minStopDuration = 1000; // Minimum 1 second stopped
const maxStopDuration = 4000; // Maximum 4 seconds stopped

// Initialize everything
window.addEventListener('load', () => {
    console.log('Window loaded, initializing pet...');
    
    // Load stored stats from main process first
    let statsLoaded = false;
    const statsToLoad = ['hunger', 'rest', 'health', 'happiness'];
    let loadedStatsCount = 0;
    
    // Listen for stored stats from main process
    ipcRenderer.on('stats:load', (_event, payload) => {
        if (!payload || !payload.key) return;
        
        const key = payload.key;
        const value = typeof payload.value === 'number' ? payload.value : (key === 'hunger' || key === 'rest' ? 50 : 50);
        
        // Update the corresponding variable
        if (key === 'hunger') {
            hunger = value;
            console.log('Loaded stored hunger:', hunger);
        } else if (key === 'rest') {
            rest = value;
            console.log('Loaded stored rest:', rest);
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
        // Note: Hunger decay is now handled in main.js, so it persists even when windows are closed
        
        console.log('Pet initialized with stats - Hunger:', hunger, 'Rest:', rest);
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

    // Handle spawning items from the Shop
    ipcRenderer.on('shop:spawnItem', (_event, payload) => {
        if (!payload || !payload.imagePath) return;
        spawnFoodAndGoToIt(payload.imagePath);
    });

    // Handle sleep/wake actions
    ipcRenderer.on('action:sleep', () => {
        if (!isSleeping) {
            startSleeping();
        }
    });

    ipcRenderer.on('action:wake', () => {
        if (isSleeping) {
            stopSleeping();
        }
    });
    
    // Listen for stat updates from main process (e.g., hunger decay)
    // This ensures the pet window stays in sync with main process stats
    ipcRenderer.on('stats:update', (_event, payload) => {
        if (!payload || !payload.key) return;
        
        const key = payload.key;
        const value = typeof payload.value === 'number' ? payload.value : 0;
        
        // Update local variables when stats change from main process
        if (key === 'hunger') {
            const oldHunger = hunger;
            hunger = value;
            console.log('Hunger updated from main process:', hunger);
            
            // If hunger decreased and food is available, pet should try to eat
            if (hunger < oldHunger && hunger < HUNGER_MAX && foodItems.length > 0 && !isEating && !isHappy && !isSleeping) {
                moveToNearestFood();
            }
        } else if (key === 'rest') {
            rest = value;
        }
    });
});

function spawnFoodAndGoToIt(imagePath) {
    if (!pet) return;
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Food';
    item.className = 'food-item'; // Add class to identify food items
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
    item.addEventListener('click', () => {
        removeFoodItem(item);
    });

    container.appendChild(item);
    
    // Add to food items array
    foodItems.push(item);

    // Move pet to nearest food only if hunger is less than 100
    if (hunger < HUNGER_MAX) {
        moveToNearestFood();
    }
}

// Remove a food item when clicked by user
function removeFoodItem(foodItem) {
    if (!foodItem || !foodItem.parentNode) return;
    
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
    if (!pet || hunger >= HUNGER_MAX) return;
    
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
    
    // Aim pet so its center aligns over the food center (pet ~120px, food ~48px)
    const petWidth = 120;
    const petHeight = 120;
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

function initializePet() {
    pet = document.getElementById('pet');
    
    if (!pet) {
        console.error('Pet element not found!');
        setTimeout(initializePet, 100);
        return;
    }
    
    console.log('Pet element found!');
    
    // Make sure pet is visible
    pet.style.position = 'absolute';
    pet.style.display = 'block';
    pet.style.visibility = 'visible';
    pet.style.opacity = '1';
    pet.style.left = '50px';
    pet.style.top = '50px';
    pet.style.zIndex = '100';
    
    // Get container dimensions
    const container = document.querySelector('.pet-container');
    if (container) {
        const rect = container.getBoundingClientRect();
        console.log('Container size:', rect.width, rect.height);
        
        // Set initial position to center
        const petWidth = 120;
        const petHeight = 120;
        petX = (rect.width - petWidth) / 2;
        petY = (rect.height - petHeight) / 2;
        
        pet.style.left = petX + 'px';
        pet.style.top = petY + 'px';
        
        // Set initial target
        chooseNewTarget();
        
        // Schedule first state change
        scheduleNextStateChange();
        
        // Start animation
        if (!animationRunning) {
            startAnimation();
        }
    } else {
        console.error('Container not found!');
    }
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
    if (!pet) return;
    // Sleeping takes highest priority
    if (isSleeping) {
        pet.src = sleepSprite;
        return;
    }
    // Happiness animation takes priority
    if (isHappy) {
        happinessSpriteIndex = (happinessSpriteIndex + 1) % happinessSprites.length;
        pet.src = happinessSprites[happinessSpriteIndex];
    } else if (isWalking || isEating) {
        // Animate when walking or eating (chewing)
        currentSpriteIndex = (currentSpriteIndex + 1) % sprites.length;
        pet.src = sprites[currentSpriteIndex];
    }
}

function updatePosition() {
    if (!pet) return;
    // Don't move when sleeping
    if (isSleeping) return;
    // If food is present and not eating yet, force walking and move to nearest food
    if (foodItems.length > 0 && !isEating && hunger < HUNGER_MAX) {
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
    const petWidth = 120;
    const petHeight = 120;
    
    // Calculate distance to target
    const dx = targetX - petX;
    const dy = targetY - petY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If close enough to target
    if (distance < 5) { // Increased threshold to ensure pet reaches food
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
        petX += (dx / distance) * walkSpeed;
        petY += (dy / distance) * walkSpeed;
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
    // Disable random state changes while eating, sleeping, during happiness animation, or when food is present
    if (isEating || isSleeping || isHappy || (foodItems.length > 0 && hunger < HUNGER_MAX)) return;
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
                pet.src = sprites[0];
            }
        }
    }
}

function animate() {
    if (!animationRunning) return;
    
    const currentTime = Date.now();
    
    // Check if we should change walking state
    checkStateChange(currentTime);
    
    // Update sprite (when walking, eating, or happy)
    if (isWalking || isEating || isHappy) {
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
    // Verify food still exists and is in the food items array
    if (!currentFoodEl || !currentFoodEl.parentNode || isEating) {
        // Food was removed or invalid, find nearest food if available
        if (foodItems.length > 0 && hunger < HUNGER_MAX) {
            moveToNearestFood();
        }
        return;
    }
    
    // Verify this food is still in our food items array
    if (!foodItems.includes(currentFoodEl)) {
        // Food was removed from array but element still exists, find nearest
        if (foodItems.length > 0 && hunger < HUNGER_MAX) {
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
    
    // Remove from food items array
    foodItems = foodItems.filter(food => food !== currentFoodEl);
    
    currentFoodEl = null;
    isEating = false;
    // Increase hunger by 5 and clamp
    setHunger(hunger + 5);
    
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
    happinessSpriteIndex = 0; // Start with botamon.png (index 0)
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
            pet.src = sprites[0];
        }
    }, totalDuration);
}

function setHunger(value) {
    hunger = Math.max(HUNGER_MIN, Math.min(HUNGER_MAX, value));
    // Notify main to forward update to stats window
    try {
        ipcRenderer.send('stats:update', { key: 'hunger', value: hunger, max: HUNGER_MAX });
    } catch (_) {}
}

function setRest(value) {
    rest = Math.max(REST_MIN, Math.min(REST_MAX, value));
    // Notify main to forward update to stats window
    try {
        ipcRenderer.send('stats:update', { key: 'rest', value: rest, max: REST_MAX });
    } catch (_) {}
    
    // Auto-wake when rest reaches 100
    if (rest >= REST_MAX && isSleeping) {
        stopSleeping();
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
    if (!pet || isSleeping) return;
    
    isSleeping = true;
    isWalking = false;
    isHappy = false;
    isEating = false;
    
    // Change sprite to sleep sprite
    pet.src = sleepSprite;
    
    // Create sleeping Z's
    createSleepZs();
    
    // Start rest increment
    startRestIncrement();
    
    // Notify main process that pet is sleeping (to update menu)
    try {
        ipcRenderer.send('pet:sleeping', true);
    } catch (_) {}
}

// Stop sleeping
function stopSleeping() {
    if (!pet || !isSleeping) return;
    
    isSleeping = false;
    
    // Remove sleeping Z's
    removeSleepZs();
    
    // Stop rest increment
    stopRestIncrement();
    
    // Reset to normal sprite
    currentSpriteIndex = 0;
    pet.src = sprites[0];
    
    // Resume normal behavior
    isWalking = true;
    scheduleNextStateChange();
    chooseNewTarget();
    
    // Notify main process that pet is awake (to update menu)
    try {
        ipcRenderer.send('pet:sleeping', false);
    } catch (_) {}
}

// Start rest increment while sleeping (works even when window is minimized)
function startRestIncrement() {
    // Clear any existing interval
    if (restIncrementIntervalId) {
        clearInterval(restIncrementIntervalId);
    }
    
    // Set up interval to increase rest every minute while sleeping
    // Uses setInterval which continues even when window is minimized (like eating timeout)
    restIncrementIntervalId = setInterval(() => {
        if (isSleeping) {
            const newRest = rest + REST_INCREMENT_AMOUNT;
            setRest(newRest);
        } else {
            stopRestIncrement();
        }
    }, REST_INCREMENT_INTERVAL);
}

// Stop rest increment
function stopRestIncrement() {
    if (restIncrementIntervalId) {
        clearInterval(restIncrementIntervalId);
        restIncrementIntervalId = null;
    }
}
