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
});

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
    // Only animate sprite when walking
    if (isWalking) {
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
    
    // If reached target, choose new one (only when walking)
    if (distance < 2) {
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
    
    // Update sprite (only when walking)
    if (isWalking) {
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
