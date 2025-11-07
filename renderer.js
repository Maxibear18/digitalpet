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
let wasteItems = []; // Array of all waste items on screen
let wasteCount = 0; // Track total waste count for sickness mechanic
let wasteSpawnIntervalId = null; // Interval ID for waste spawning

// Sickness mechanic
let isSick = false; // Pet starts healthy
let medicineItems = []; // Array of all medicine items on screen
let currentMedicineEl = null; // Currently targeted medicine item
// Health decay is now handled in main.js for persistence
let sicknessBubbles = []; // Array of sickness bubble elements
let bubbleSpawnIntervalId = null; // Interval ID for spawning bubbles

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
const HUNGER_DECAY_INTERVAL = 150000; // 2.5 minutes in milliseconds
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
        const value = typeof payload.value === 'number' ? payload.value : (key === 'hunger' || key === 'rest' || key === 'happiness' ? 50 : 50);
        const max = typeof payload.max === 'number' ? payload.max : 100;
        
        // Update the stat bar in the pet window
        updateStatBar(key, value, max);
        
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
        // Note: Hunger decay is now handled in main.js, so it persists even when windows are closed
        
        // Start waste spawning system
        startWasteSpawning();
        
        // Update sickness state if already sick (notifies main process)
        if (isSick) {
            startHealthDecay(); // Notifies main.js to start health decay
            updateSickAppearance();
        }
        
        // Send initial waste count to main process
        sendWasteCountUpdate();
        
        console.log('Pet initialized with stats - Health:', health, 'Hunger:', hunger, 'Rest:', rest, 'Happiness:', happiness, 'Sick:', isSick);
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
        // Check if it's medicine or food
        if (payload.type === 'medicine') {
            spawnMedicineAndGoToIt(payload.imagePath);
        } else {
            spawnFoodAndGoToIt(payload.imagePath);
        }
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
    
    // Listen for pet becoming sick from main process
    ipcRenderer.on('pet:becameSick', () => {
        if (!isSick) {
            isSick = true;
            startHealthDecay(); // Notifies main.js (though it should already be running)
            updateSickAppearance();
            console.log('Pet became sick!');
        }
    });
    
    // Listen for pet becoming healthy from main process
    ipcRenderer.on('pet:becameHealthy', () => {
        if (isSick) {
            isSick = false;
            stopHealthDecay();
            stopSicknessBubbles();
            updateSickAppearance();
            console.log('Pet became healthy!');
        }
    });
    
    // Listen for stat updates from main process (e.g., hunger decay)
    // This ensures the pet window stays in sync with main process stats
    ipcRenderer.on('stats:update', (_event, payload) => {
        if (!payload || !payload.key) return;
        
        const key = payload.key;
        const value = typeof payload.value === 'number' ? payload.value : 0;
        const max = typeof payload.max === 'number' ? payload.max : 100;
        
        // Update the stat bar in the pet window
        updateStatBar(key, value, max);
        
        // Update local variables when stats change from main process
        if (key === 'hunger') {
            const oldHunger = hunger;
            hunger = value;
            console.log('Hunger updated from main process:', hunger);
            
            // If hunger decreased and food is available, pet should try to eat (but not if sick)
            if (hunger < oldHunger && hunger < HUNGER_MAX && foodItems.length > 0 && !isEating && !isHappy && !isSleeping && !isSick) {
                moveToNearestFood();
            }
        } else if (key === 'rest') {
            rest = value;
        } else if (key === 'happiness') {
            happiness = value;
        } else if (key === 'health') {
            health = value;
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
function spawnMedicineAndGoToIt(imagePath) {
    if (!pet) return;
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Medicine';
    item.className = 'medicine-item'; // Add class to identify medicine items
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
    if (!pet || !isSick) return; // Only go to medicine if sick
    
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
    
    // Aim pet so its center aligns over the medicine center (pet ~120px, medicine ~48px)
    const petWidth = 120;
    const petHeight = 120;
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
    // Verify medicine still exists and is in the medicine items array
    if (!currentMedicineEl || !currentMedicineEl.parentNode || isEating) {
        // Medicine was removed or invalid, find nearest medicine if available
        if (medicineItems.length > 0 && isSick) {
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
    
    // Cure the sickness
    cureSickness();
    
    // Play happiness animation
    playHappinessAnimation(false);
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
    // Don't move to food if sick - pet doesn't want to eat when sick
    if (!pet || hunger >= HUNGER_MAX || isSick) return;
    
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
    
    // Make sure pet is visible
    pet.style.position = 'absolute';
    pet.style.display = 'block';
    pet.style.visibility = 'visible';
    pet.style.opacity = '1';
    pet.style.left = '50px';
    pet.style.top = '50px';
    pet.style.zIndex = '100';
    pet.style.pointerEvents = 'auto'; // Ensure pet can receive clicks
    
    // Update appearance based on sickness state
    updateSickAppearance();
    
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
        
        // Check all waste items if no food or medicine was clicked
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
        // 2. Pet is not sleeping
        // 3. Click didn't hit food/medicine/waste
        // 4. Click hit an actual opaque pixel in the pet sprite
        if (!hasMoved && !isSleeping && !clickedItem && isClickOnPetPixel(e.clientX, e.clientY)) {
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
        if (pet.src !== sleepSprite) {
            pet.src = sleepSprite;
            reloadPetImageData(); // Reload image data for new sprite
            // Bubbles continue automatically, no need to update
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
    // Don't move when sleeping
    if (isSleeping) return;
    
    // If sick and medicine is present, move to nearest medicine (priority over food)
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
    const petWidth = 120;
    const petHeight = 120;
    
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
    // Disable random state changes while eating, sleeping, during happiness animation, when food is present, or when medicine is present
    if (isEating || isSleeping || isHappy || 
        (foodItems.length > 0 && hunger < HUNGER_MAX && !isSick) || 
        (medicineItems.length > 0 && isSick)) return;
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
    // Don't eat if sick - pet doesn't want to eat when sick
    if (isSick) {
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
    health = Math.max(HEALTH_MIN, Math.min(HEALTH_MAX, value));
    // Update stat bar directly
    updateStatBar('health', health, HEALTH_MAX);
    // Notify main to store the update
    try {
        ipcRenderer.send('stats:update', { key: 'health', value: health, max: HEALTH_MAX });
    } catch (_) {}
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

// Handle pet click for petting
function handlePetClick() {
    if (isSleeping) return; // Can't pet while sleeping
    
    // Increment click count
    petClickCount++;
    
    // Play happiness animation (if not already playing and not eating)
    if (!isHappy && !isEating) {
        playHappinessAnimation(false);
    }
    
    // Check if we've reached 5 clicks
    if (petClickCount >= PETS_FOR_HAPPINESS) {
        // Increase happiness by 1
        setHappiness(happiness + 1);
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
    if (!pet || isSleeping) return;
    
    isSleeping = true;
    isWalking = false;
    isHappy = false;
    isEating = false;
    
    // Change sprite to sleep sprite
    pet.src = sleepSprite;
    updateSickAppearance(); // Update bubbles if sick
    
    // Create sleeping Z's
    createSleepZs();
    
    // Rest increment is now handled in main.js for persistence
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
    
    // Rest increment is now handled in main.js for persistence
    // Reset to normal sprite
    currentSpriteIndex = 0;
    pet.src = sprites[0];
    updateSickAppearance(); // Update bubbles if sick
    
    // Resume normal behavior
    // If sick and medicine is available, go to medicine, otherwise resume normal walking
    if (isSick && medicineItems.length > 0) {
        moveToNearestMedicine();
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
const wasteSpritePath = 'sprites/waste.png';

// Start waste spawning system - pet leaves waste every 3 minutes
function startWasteSpawning() {
    // Clear any existing interval
    if (wasteSpawnIntervalId) {
        clearInterval(wasteSpawnIntervalId);
    }
    
    // Spawn waste every 3 minutes
    wasteSpawnIntervalId = setInterval(() => {
        spawnWaste();
    }, WASTE_SPAWN_INTERVAL);
}

// Spawn waste at pet's current position
function spawnWaste() {
    if (!pet) return;
    
    // Don't spawn waste if pet is sleeping
    if (isSleeping) {
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
