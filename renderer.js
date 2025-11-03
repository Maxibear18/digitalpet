const { ipcRenderer } = require('electron');

// Sprite paths for walking cycle
const sprites = [
    'sprites/botamon.png',
    'sprites/botamon 2.png'
];
let currentSpriteIndex = 0;

// Pet position
let petX = 50;
let petY = 50;
let targetX = 50;
let targetY = 50;
const walkSpeed = 0.4; // Slower movement
let pet = null;
let animationRunning = false;
let isWalking = true; // Walking state
let isEating = false; // Eating state
let currentFoodEl = null;
let currentFoodX = 0;
let currentFoodY = 0;
let eatingTimeoutId = null;

// Hunger (0-100)
let hunger = 50;
const HUNGER_MAX = 100;
const HUNGER_MIN = 0;
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
    initializePet();
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
});

function spawnFoodAndGoToIt(imagePath) {
    if (!pet) return;
    const container = document.querySelector('.pet-container');
    if (!container) return;

    const item = document.createElement('img');
    item.src = imagePath;
    item.alt = 'Item';
    item.style.position = 'absolute';
    item.style.imageRendering = 'pixelated';
    item.style.pointerEvents = 'none';
    item.style.zIndex = '90';
    item.style.width = '48px';
    item.style.height = 'auto';

    // Spawn at a random location within container
    const rect = container.getBoundingClientRect();
    const spawnX = Math.max(0, Math.min(rect.width - 48, Math.random() * (rect.width - 48)));
    const spawnY = Math.max(0, Math.min(rect.height - 48, Math.random() * (rect.height - 48)));
    item.style.left = spawnX + 'px';
    item.style.top = spawnY + 'px';

    container.appendChild(item);

    // Track current food and move pet to it
    currentFoodEl = item;
    currentFoodX = spawnX;
    currentFoodY = spawnY;
    isEating = false;

    // Force walking toward the food
    isWalking = true;
    // Aim pet so its center aligns over the food center (pet ~120px, food ~48px)
    const petWidth = 120;
    const petHeight = 120;
    const foodWidth = 48;
    const foodHeight = 48;
    let desiredX = currentFoodX + (foodWidth / 2) - (petWidth / 2);
    let desiredY = currentFoodY + (foodHeight / 2) - (petHeight / 2);
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
    // Animate when walking or eating (chewing)
    if (isWalking || isEating) {
        currentSpriteIndex = (currentSpriteIndex + 1) % sprites.length;
        pet.src = sprites[currentSpriteIndex];
    }
}

function updatePosition() {
    if (!pet || !isWalking) return; // Don't move when stopped
    
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
    if (distance < 1) {
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
    const currentTime = performance.now();
    
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
    // Disable random state changes while eating
    if (isEating) return;
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

function animate(currentTime) {
    if (!animationRunning) return;
    
    // Check if we should change walking state
    checkStateChange(currentTime);
    
    // Update sprite (when walking or eating)
    if (isWalking || isEating) {
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
    
    // Continue
    requestAnimationFrame(animate);
}

function startAnimation() {
    if (animationRunning) return;
    
    console.log('Starting animation...');
    animationRunning = true;
    lastSpriteUpdate = 0;
    requestAnimationFrame(animate);
}

function beginEating() {
    if (!currentFoodEl || isEating) return;
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
    // Remove food element
    if (currentFoodEl && currentFoodEl.parentNode) {
        currentFoodEl.parentNode.removeChild(currentFoodEl);
    }
    currentFoodEl = null;
    isEating = false;
    // Increase hunger by 5 and clamp
    setHunger(hunger + 5);
    // Resume walking
    isWalking = true;
    scheduleNextStateChange();
    chooseNewTarget();
}

function setHunger(value) {
    hunger = Math.max(HUNGER_MIN, Math.min(HUNGER_MAX, value));
    // Notify main to forward update to stats window
    try {
        ipcRenderer.send('stats:update', { key: 'hunger', value: hunger, max: HUNGER_MAX });
    } catch (_) {}
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
    
    if (targetX > maxX || targetY > maxY) {
        chooseNewTarget();
    }
});
