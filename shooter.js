const { ipcRenderer } = require('electron');

let playerMoney = 0;
let score = 0;
let gameActive = false;
let gameTimeLeft = 60;
let speedLevel = 1;
let earnedMoney = 0;
let gameInterval = null;
let timeInterval = null;
let spawnInterval = null;

// Food images
const FOOD_IMAGES = [
    'sprites/food/cherry.png',
    'sprites/food/riceball.png',
    'sprites/food/sandwich.png',
    'sprites/food/Food1.png',
    'sprites/food/cake.png',
    'sprites/food/ice cream.png'
];

// Baby pet images (basic pets only)
const BABY_PET_IMAGES = [
    'sprites/basic pets/botamon/botamon.png',
    'sprites/basic pets/poyomon/poyomon.png',
    'sprites/basic pets/punimon/punimon.png',
    'sprites/basic pets/pitchmon/pitchmon.png',
    'sprites/basic pets/koromon/koromon.png',
    'sprites/basic pets/tokomon/tokomon.png'
];

const gameArea = document.getElementById('gameArea');
const startBtn = document.getElementById('startBtn');
const startMessage = document.getElementById('startMessage');
const scoreDisplay = document.getElementById('scoreDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const playerMoneyDisplay = document.getElementById('playerMoney');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

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

function startGame() {
    if (gameActive) return;
    
    gameActive = true;
    score = 0;
    gameTimeLeft = 60;
    speedLevel = 1;
    earnedMoney = 0;
    
    // Clear any existing items
    clearGameArea();
    
    startBtn.disabled = true;
    startMessage.style.display = 'none';
    
    updateDisplay();
    
    // Start game timer
    timeInterval = setInterval(() => {
        gameTimeLeft--;
        updateDisplay();
        
        // Increase speed every 10 seconds
        if (gameTimeLeft % 10 === 0 && gameTimeLeft < 60) {
            speedLevel++;
        }
        
        if (gameTimeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    // Spawn items at intervals (faster as speed increases)
    spawnItems();
}

function spawnItems() {
    if (!gameActive) return;
    
    // Spawn interval decreases as speed increases (starts at 1500ms, decreases by 100ms per level)
    const spawnDelay = Math.max(500, 1500 - (speedLevel - 1) * 100);
    
    spawnInterval = setTimeout(() => {
        if (!gameActive) return;
        
        // 70% chance for food, 30% chance for baby pet
        const isFood = Math.random() < 0.7;
        spawnItem(isFood);
        
        spawnItems(); // Continue spawning
    }, spawnDelay);
}

function spawnItem(isFood) {
    if (!gameActive) return;
    
    const item = document.createElement('div');
    item.className = 'falling-item';
    if (isFood) {
        item.classList.add('food-item');
    } else {
        item.classList.add('pet-item');
    }
    
    const img = document.createElement('img');
    if (isFood) {
        const randomFood = FOOD_IMAGES[Math.floor(Math.random() * FOOD_IMAGES.length)];
        img.src = randomFood;
        item.dataset.type = 'food';
    } else {
        const randomPet = BABY_PET_IMAGES[Math.floor(Math.random() * BABY_PET_IMAGES.length)];
        img.src = randomPet;
        item.dataset.type = 'pet';
    }
    img.style.width = '50px';
    img.style.height = '50px';
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'pixelated';
    img.draggable = false; // Prevent dragging
    
    item.appendChild(img);
    item.draggable = false; // Prevent dragging on container too
    
    // Random side to spawn from (0 = top, 1 = right, 2 = bottom, 3 = left)
    const side = Math.floor(Math.random() * 4);
    const baseSpeed = 3.5; // Start faster
    const speed = baseSpeed + (speedLevel - 1) * 1.2; // More substantial speed increase
    
    let startX, startY, dirX, dirY;
    
    if (side === 0) {
        // Top
        startX = Math.random() * (gameArea.offsetWidth - 50);
        startY = -50;
        dirX = 0;
        dirY = speed;
    } else if (side === 1) {
        // Right
        startX = gameArea.offsetWidth;
        startY = Math.random() * (gameArea.offsetHeight - 50);
        dirX = -speed;
        dirY = 0;
    } else if (side === 2) {
        // Bottom
        startX = Math.random() * (gameArea.offsetWidth - 50);
        startY = gameArea.offsetHeight;
        dirX = 0;
        dirY = -speed;
    } else {
        // Left
        startX = -50;
        startY = Math.random() * (gameArea.offsetHeight - 50);
        dirX = speed;
        dirY = 0;
    }
    
    item.style.left = startX + 'px';
    item.style.top = startY + 'px';
    
    gameArea.appendChild(item);
    
    // Animate movement
    let currentX = startX;
    let currentY = startY;
    const moveInterval = setInterval(() => {
        if (!gameActive || !item.parentNode) {
            clearInterval(moveInterval);
            return;
        }
        
        currentX += dirX;
        currentY += dirY;
        item.style.left = currentX + 'px';
        item.style.top = currentY + 'px';
        
        // Remove if it goes off screen
        if (currentX < -50 || currentX > gameArea.offsetWidth || 
            currentY < -50 || currentY > gameArea.offsetHeight) {
            clearInterval(moveInterval);
            if (item.parentNode) {
                item.remove();
            }
        }
    }, 16); // ~60fps
    
    // Click handler
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!gameActive) return;
        
        clearInterval(moveInterval);
        item.remove();
        
        if (item.dataset.type === 'food') {
            // Food clicked - add point
            score++;
            if (score % 5 === 0) {
                earnedMoney += 8;
            }
        } else {
            // Pet clicked - lose point
            score = Math.max(0, score - 1);
        }
        
        updateDisplay();
    });
    
    // Prevent drag events
    item.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });
    item.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });
}

function clearGameArea() {
    const items = gameArea.querySelectorAll('.falling-item');
    items.forEach(item => item.remove());
}

function endGame() {
    gameActive = false;
    
    // Clear intervals
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
    if (spawnInterval) {
        clearTimeout(spawnInterval);
        spawnInterval = null;
    }
    
    // Clear all falling items
    clearGameArea();
    
    // Add earned money to player money
    if (earnedMoney > 0) {
        playerMoney += earnedMoney;
        updateMoney();
    }
    
    // Send rewards to main process
    ipcRenderer.send('game:reward', {
        money: earnedMoney,
        experience: 15,
        rest: -10, // Lose 10 sleep
        hunger: -10 // Lose 10 hunger
    });
    
    startMessage.textContent = `Game Over! Final Score: ${score} | Money Earned: $${earnedMoney}`;
    startMessage.style.display = 'block';
    startBtn.disabled = false;
}

function updateDisplay() {
    playerMoneyDisplay.textContent = `$${playerMoney}`;
    scoreDisplay.textContent = score;
    timeDisplay.textContent = gameTimeLeft;
}

function updateMoney() {
    ipcRenderer.send('money:update', playerMoney);
}

// Event listeners
startBtn.addEventListener('click', startGame);

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

