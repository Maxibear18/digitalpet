const { ipcRenderer } = require('electron');

let playerMoney = 0;
let gameActive = false;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = null;
let foodImage = null;
let gridSize = 20;
let canvas, ctx;
let earnedMoney = 0;
let petType = 'botamon';
let evolutionStage = 1;
let petSprites = {};
let gameLoopInterval = null;
let animationFrame = null;
let smoothPositions = []; // For smooth sliding movement
let lastAnimateTime = 0;

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

// Request pet type
ipcRenderer.send('game:requestPetType');

// Listen for pet type update
ipcRenderer.on('game:petType', (_event, receivedPetType, receivedEvolutionStage) => {
    petType = receivedPetType || 'botamon';
    evolutionStage = receivedEvolutionStage || 1;
    loadPetSprites();
});

const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('gameOverlay');
const overlayMessage = document.getElementById('overlayMessage');
const lengthDisplay = document.getElementById('lengthDisplay');
const playerMoneyDisplay = document.getElementById('playerMoney');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// Initialize canvas
canvas = document.getElementById('gameCanvas');
ctx = canvas.getContext('2d');

// Adjust canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.offsetWidth - 32, container.offsetHeight - 32, 400);
    canvas.width = size;
    canvas.height = size;
    gridSize = Math.floor(size / 7); // 7x7 grid (larger cells, more zoomed in)
    if (gameActive) {
        draw();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Load pet sprites
function loadPetSprites() {
    const PET_TYPES = {
        botamon: {
            walk: ['sprites/basic pets/botamon/botamon.png', 'sprites/basic pets/botamon/botamon 2.png'],
            evolution: 'koromon'
        },
        poyomon: {
            walk: ['sprites/basic pets/poyomon/poyomon.png', 'sprites/basic pets/poyomon/poyomon 2.png'],
            evolution: 'tokomon'
        },
        punimon: {
            walk: ['sprites/basic pets/punimon/punimon.png', 'sprites/basic pets/punimon/punimon 2.png'],
            evolution: 'tsunomon'
        },
        pitchmon: {
            walk: ['sprites/basic pets/pitchmon/pitchmon.png', 'sprites/basic pets/pitchmon/pitchmon 2.png'],
            evolution: 'pakumon'
        },
        koromon: {
            walk: ['sprites/basic pets/koromon/koromon.png', 'sprites/basic pets/koromon/koromon 2.png'],
            evolution: 'agumon'
        },
        tokomon: {
            walk: ['sprites/basic pets/tokomon/tokomon.png', 'sprites/basic pets/tokomon/tokomon 2.png'],
            evolution: 'patamon'
        },
        tsunomon: {
            walk: ['sprites/basic pets/tsunomon/tsunomon.png', 'sprites/basic pets/tsunomon/tsunomon 2.png'],
            evolution: 'gabumon'
        },
        pakumon: {
            walk: ['sprites/basic pets/pakumon/pakumon.png', 'sprites/basic pets/pakumon/pakumon 2.png'],
            evolution: 'betamon'
        },
        agumon: {
            walk: ['sprites/basic pets/agumon/agumon.png', 'sprites/basic pets/agumon/agumon 2.png'],
            evolution: 'greymon'
        },
        betamon: {
            walk: ['sprites/basic pets/betamon/betamon.png', 'sprites/basic pets/betamon/betamon 2.png'],
            evolution: 'seadramon'
        },
        gabumon: {
            walk: ['sprites/basic pets/gabumon/gabumon.png', 'sprites/basic pets/gabumon/gabumon 2.png'],
            evolution: 'garurumon'
        },
        patamon: {
            walk: ['sprites/basic pets/patamon/patamon.png', 'sprites/basic pets/patamon/patamon 2.png'],
            evolution: 'angemon'
        },
        greymon: {
            walk: ['sprites/basic pets/greymon/greymon.png', 'sprites/basic pets/greymon/greymon 2.png']
        },
        garurumon: {
            walk: ['sprites/basic pets/garurumon/garurumon.png', 'sprites/basic pets/garurumon/garurumon 2.png']
        },
        angemon: {
            walk: ['sprites/basic pets/angemon/angemon.png', 'sprites/basic pets/angemon/angemon 2.png']
        },
        seadramon: {
            walk: ['sprites/basic pets/seadramon/seadramon.png', 'sprites/basic pets/seadramon/seadramon 2.png']
        },
        giromon: {
            walk: ['sprites/inter pets/giromon/giromon.png', 'sprites/inter pets/giromon/giromon 2.png'],
            evolution: 'mamemon'
        },
        zurumon: {
            walk: ['sprites/inter pets/zurumon/zurumon.png', 'sprites/inter pets/zurumon/zurumon 2.png'],
            evolution: 'pagumon'
        },
        yuramon: {
            walk: ['sprites/inter pets/yuramon/yuramon.png', 'sprites/inter pets/yuramon/yuramon 2.png'],
            evolution: 'tanemon'
        },
        pixiemon: {
            walk: ['sprites/inter pets/pixiemon/pixiemon.png', 'sprites/inter pets/pixiemon/pixiemon 2.png'],
            evolution: 'flymon'
        },
        pagumon: {
            walk: ['sprites/inter pets/pagumon/pagumon.png', 'sprites/inter pets/pagumon/pagumon 2.png'],
            evolution: 'gazimon'
        },
        gazimon: {
            walk: ['sprites/inter pets/gazimon/gazimon.png', 'sprites/inter pets/gazimon/gazimon 2.png'],
            evolution: 'gizamon'
        },
        gizamon: {
            walk: ['sprites/inter pets/gizamon/gizamon.png', 'sprites/inter pets/gizamon/gizamon 2.png']
        },
        tanemon: {
            walk: ['sprites/inter pets/tanemon/tanemon.png', 'sprites/inter pets/tanemon/tanemon 2.png'],
            evolution: 'palmon'
        },
        palmon: {
            walk: ['sprites/inter pets/palmon/palmon.png', 'sprites/inter pets/palmon/palmon 2.png'],
            evolution: 'vegimon'
        },
        vegimon: {
            walk: ['sprites/inter pets/vegimon/vegimon.png', 'sprites/inter pets/vegimon/vegimon 2.png']
        },
        mamemon: {
            walk: ['sprites/inter pets/mamemon/mamemon.png', 'sprites/inter pets/mamemon/mamemon 2.png'],
            evolution: 'monzaemon'
        },
        monzaemon: {
            walk: ['sprites/inter pets/monzaemon/monzaemon.png', 'sprites/inter pets/monzaemon/monzaemon 2.png'],
            evolution: 'yukidarumon'
        },
        yukidarumon: {
            walk: ['sprites/inter pets/yukidramon/yukidarumon.png', 'sprites/inter pets/yukidramon/yukidarumon 2.png']
        },
        flymon: {
            walk: ['sprites/inter pets/flymon/flymon.png', 'sprites/inter pets/flymon/flymon 2.png'],
            evolution: 'piyomon'
        },
        piyomon: {
            walk: ['sprites/inter pets/piyomon/piyomon.png', 'sprites/inter pets/piyomon/piyomon 2.png'],
            evolution: 'birdramon'
        },
        birdramon: {
            walk: ['sprites/inter pets/birdramon/birdramon.png', 'sprites/inter pets/birdramon/birdramon 2.png']
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
    
    const resolvedType = getResolvedTypeForStage(petType, evolutionStage);
    const petData = PET_TYPES[resolvedType] || PET_TYPES.botamon;
    
    // Load sprites
    const headImg = new Image();
    headImg.src = encodeURI(petData.walk[0]);
    petSprites.head = headImg;
    
    const bodyImg = new Image();
    bodyImg.src = encodeURI(petData.walk[1] || petData.walk[0]);
    petSprites.body = bodyImg;
    
    // Load different pet types for body segments
    const bodyPetTypes = [
        'botamon', 'poyomon', 'punimon', 'pitchmon', 'koromon', 'tokomon',
        'tsunomon', 'pakumon', 'agumon', 'betamon', 'gabumon', 'patamon',
        'giromon', 'zurumon', 'yuramon', 'pixiemon', 'pagumon', 'gazimon',
        'tanemon', 'palmon'
    ];
    
    petSprites.bodyPets = [];
    bodyPetTypes.forEach(petTypeKey => {
        const bodyPetData = PET_TYPES[petTypeKey];
        if (bodyPetData) {
            const bodyPetImg = new Image();
            bodyPetImg.src = encodeURI(bodyPetData.walk[0]);
            petSprites.bodyPets.push(bodyPetImg);
        }
    });
    
    // Load food image
    const foodImg = new Image();
    foodImg.src = 'sprites/food/cherry.png';
    foodImage = foodImg;
}

function startGame() {
    if (gameActive) return;
    
    gameActive = true;
    earnedMoney = 0;
    lastAnimateTime = 0;
    
    // Clear any existing interval
    if (gameLoopInterval) {
        clearTimeout(gameLoopInterval);
        gameLoopInterval = null;
    }
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Initialize snake in center of 7x7 grid
    snake = [{ x: 3, y: 3 }]; // Center of 7x7 grid
    
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    
    // Initialize smooth positions for sliding
    smoothPositions = snake.map(segment => ({
        x: segment.x * gridSize,
        y: segment.y * gridSize,
        targetX: segment.x * gridSize,
        targetY: segment.y * gridSize,
        progress: 1
    }));
    
    spawnFood();
    
    overlay.style.display = 'none';
    startBtn.disabled = true;
    
    updateDisplay();
    draw();
    animate(); // Start smooth sliding animation
    gameLoop();
}

function spawnFood() {
    const maxX = 7; // 7x7 grid
    const maxY = 7;
    
    let foodX, foodY;
    do {
        foodX = Math.floor(Math.random() * maxX);
        foodY = Math.floor(Math.random() * maxY);
    } while (snake.some(segment => segment.x === foodX && segment.y === foodY));
    
    food = { x: foodX, y: foodY };
}

function gameLoop() {
    if (!gameActive) return;
    
    // Update direction from queued direction
    direction = { ...nextDirection };
    
    // Move snake head
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;
    
    // Check wall collision - 7x7 grid
    const maxX = 7;
    const maxY = 7;
    
    if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
        endGame();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        spawnFood();
        // Check if we've collected 3 pets (snake length is multiple of 3)
        if (snake.length % 3 === 0) {
            earnedMoney += 6;
        }
    } else {
        snake.pop();
    }
    
    // Update smooth positions for sliding movement
    const newSmoothPositions = [];
    snake.forEach((segment, index) => {
        if (index < smoothPositions.length) {
            // Keep existing position object, just update target
            const existing = smoothPositions[index];
            existing.targetX = segment.x * gridSize;
            existing.targetY = segment.y * gridSize;
            existing.progress = 0;
            newSmoothPositions.push(existing);
        } else {
            // New segment - create new position
            newSmoothPositions.push({
                x: segment.x * gridSize,
                y: segment.y * gridSize,
                targetX: segment.x * gridSize,
                targetY: segment.y * gridSize,
                progress: 1
            });
        }
    });
    smoothPositions = newSmoothPositions;
    
    updateDisplay();
    
    // Schedule next frame
    if (gameActive) {
        gameLoopInterval = setTimeout(gameLoop, 250);
    }
}

// Smooth sliding animation loop
function animate() {
    if (!gameActive) return;
    
    const currentTime = Date.now();
    if (lastAnimateTime === 0) lastAnimateTime = currentTime;
    const deltaTime = Math.min(currentTime - lastAnimateTime, 50); // Cap delta time
    lastAnimateTime = currentTime;
    const moveSpeed = 250; // Match game loop speed
    
    // Update smooth positions with sliding interpolation
    smoothPositions.forEach((pos, index) => {
        if (index < snake.length) {
            const targetX = snake[index].x * gridSize;
            const targetY = snake[index].y * gridSize;
            
            if (pos.targetX !== targetX || pos.targetY !== targetY) {
                pos.targetX = targetX;
                pos.targetY = targetY;
                pos.progress = 0;
            }
            
            // Smooth sliding interpolation - linear for smooth feel
            pos.progress = Math.min(1, pos.progress + (deltaTime / moveSpeed));
            
            // Linear interpolation for smooth sliding
            pos.x = pos.x + (pos.targetX - pos.x) * (deltaTime / moveSpeed) * 4;
            pos.y = pos.y + (pos.targetY - pos.y) * (deltaTime / moveSpeed) * 4;
        }
    });
    
    draw();
    
    if (gameActive) {
        animationFrame = requestAnimationFrame(animate);
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#f0f5ef';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid - more visible
    ctx.strokeStyle = '#c0d0b8';
    ctx.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw food
    if (food) {
        const foodX = food.x * gridSize;
        const foodY = food.y * gridSize;
        if (foodImage && foodImage.complete) {
            ctx.imageSmoothingEnabled = false; // Prevent fuzzy sprites
            // Draw food to fill most of the cell
            ctx.drawImage(foodImage, foodX, foodY, gridSize, gridSize);
        } else {
            // Draw placeholder if image not loaded
            ctx.fillStyle = '#5fb95a';
            ctx.fillRect(foodX, foodY, gridSize, gridSize);
        }
    }
    
    // Draw snake with smooth sliding positions
    smoothPositions.forEach((pos, index) => {
        if (index >= snake.length) return;
        
        const x = Math.round(pos.x);
        const y = Math.round(pos.y);
        
        if (index === 0) {
            // Draw head
            if (petSprites.head && petSprites.head.complete) {
                ctx.imageSmoothingEnabled = false; // Prevent fuzzy sprites
                ctx.drawImage(petSprites.head, x, y, gridSize, gridSize);
            } else {
                ctx.fillStyle = '#0f280c';
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        } else {
            // Draw body - use different pet types
            const bodyPetIndex = (index - 1) % (petSprites.bodyPets ? petSprites.bodyPets.length : 1);
            const bodyPetImg = petSprites.bodyPets && petSprites.bodyPets[bodyPetIndex];
            
            if (bodyPetImg && bodyPetImg.complete) {
                ctx.imageSmoothingEnabled = false; // Prevent fuzzy sprites
                ctx.drawImage(bodyPetImg, x, y, gridSize, gridSize);
            } else if (petSprites.body && petSprites.body.complete) {
                ctx.imageSmoothingEnabled = false; // Prevent fuzzy sprites
                ctx.drawImage(petSprites.body, x, y, gridSize, gridSize);
            } else {
                ctx.fillStyle = '#5fb95a';
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
    });
}

function endGame() {
    gameActive = false;
    
    // Clear game loop
    if (gameLoopInterval) {
        clearTimeout(gameLoopInterval);
        gameLoopInterval = null;
    }
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    // Add earned money to player money
    if (earnedMoney > 0) {
        playerMoney += earnedMoney;
        updateMoney();
    }
    
    // Send rewards to main process
    ipcRenderer.send('game:reward', {
        money: earnedMoney,
        experience: 10,
        happiness: 10,
        rest: -10, // Lose 10 sleep
        hunger: -5 // Lose 5 hunger
    });
    
    overlayMessage.textContent = `Game Over! Length: ${snake.length} | Money Earned: $${earnedMoney}`;
    overlay.style.display = 'flex';
    startBtn.disabled = false;
}

function updateDisplay() {
    playerMoneyDisplay.textContent = `$${playerMoney}`;
    lengthDisplay.textContent = snake.length;
}

function updateMoney() {
    ipcRenderer.send('money:update', playerMoney);
}

// Keyboard controls - classic snake style (queue direction changes)
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    
    const key = e.key.toLowerCase();
    e.preventDefault(); // Prevent default behavior
    
    // Queue direction change for next move (classic snake behavior)
    if ((key === 'arrowup' || key === 'w') && direction.y === 0) {
        nextDirection = { x: 0, y: -1 };
    } else if ((key === 'arrowdown' || key === 's') && direction.y === 0) {
        nextDirection = { x: 0, y: 1 };
    } else if ((key === 'arrowleft' || key === 'a') && direction.x === 0) {
        nextDirection = { x: -1, y: 0 };
    } else if ((key === 'arrowright' || key === 'd') && direction.x === 0) {
        nextDirection = { x: 1, y: 0 };
    }
});

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

// Initialize
updateDisplay();
loadPetSprites();

