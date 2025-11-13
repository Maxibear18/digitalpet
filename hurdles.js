const { ipcRenderer } = require('electron');

let gameRunning = false;
let gameStartTime = 0;
let currentTime = 0;
let moneyEarned = 0;
let gameSpeed = 1;
let lastSpeedIncrease = 0;
let lastRewardTime = 0;
let animationFrameId = null;
let obstacleSpawnTimer = null;
let isJumping = false;
let jumpStartTime = 0;
let petType = 'botamon';
let evolutionStage = 1;

const petSprite = document.getElementById('petSprite');
const petCharacter = document.getElementById('petCharacter');
const gameArea = document.getElementById('gameArea');
const obstaclesContainer = document.getElementById('obstaclesContainer');
const timerDisplay = document.getElementById('timerDisplay');
const moneyDisplay = document.getElementById('moneyDisplay');
const statusMessage = document.getElementById('statusMessage');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');

// Get pet sprite based on type and evolution stage
function updatePetSprite() {
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
            walk: ['sprites/basic pets/greymon/greymon.png', 'sprites/basic pets/greymon/greymon 2.png'],
            evolution: null
        },
        garurumon: {
            walk: ['sprites/basic pets/garurumon/garurumon.png', 'sprites/basic pets/garurumon/garurumon 2.png'],
            evolution: null
        },
        angemon: {
            walk: ['sprites/basic pets/angemon/angemon.png', 'sprites/basic pets/angemon/angemon 2.png'],
            evolution: null
        },
        seadramon: {
            walk: ['sprites/basic pets/seadramon/seadramon.png', 'sprites/basic pets/seadramon/seadramon 2.png'],
            evolution: null
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
            walk: ['sprites/inter pets/gizamon/gizamon.png', 'sprites/inter pets/gizamon/gizamon 2.png'],
            evolution: null
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
            walk: ['sprites/inter pets/vegimon/vegimon.png', 'sprites/inter pets/vegimon/vegimon 2.png'],
            evolution: null
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
            walk: ['sprites/inter pets/yukidramon/yukidarumon.png', 'sprites/inter pets/yukidramon/yukidarumon 2.png'],
            evolution: null
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
            walk: ['sprites/inter pets/birdramon/birdramon.png', 'sprites/inter pets/birdramon/birdramon 2.png'],
            evolution: null
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
    if (petData && petData.walk && petData.walk[0]) {
        petSprite.src = petData.walk[0];
    }
}

// Initialize pet sprite
updatePetSprite();

// Request pet type from main process
ipcRenderer.send('game:requestPetType');

// Listen for pet type response
ipcRenderer.on('game:petType', (_event, type, stage) => {
    petType = type;
    evolutionStage = stage;
    updatePetSprite();
});

// Game functions
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gameStartTime = Date.now();
    currentTime = 0;
    moneyEarned = 0;
    gameSpeed = 1;
    lastSpeedIncrease = 0;
    lastRewardTime = 0;
    isJumping = false;
    
    // Clear obstacles
    obstaclesContainer.innerHTML = '';
    
    startBtn.style.display = 'none';
    restartBtn.style.display = 'none';
    statusMessage.textContent = 'Press SPACE or click to jump!';
    
    // Start game loop
    gameLoop();
    spawnObstacles();
}

function gameLoop() {
    if (!gameRunning) return;
    
    const now = Date.now();
    currentTime = (now - gameStartTime) / 1000; // Time in seconds
    
    // Update timer display
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Increase speed every 5 seconds
    const speedIncreaseInterval = Math.floor(currentTime / 5);
    if (speedIncreaseInterval > lastSpeedIncrease) {
        lastSpeedIncrease = speedIncreaseInterval;
        gameSpeed = 1 + (speedIncreaseInterval * 0.1); // Increase by 10% each time
    }
    
    // Give money every 30 seconds
    const rewardInterval = Math.floor(currentTime / 30);
    if (rewardInterval > lastRewardTime) {
        lastRewardTime = rewardInterval;
        moneyEarned += 10;
        moneyDisplay.textContent = `$${moneyEarned}`;
    }
    
    // Move obstacles
    const obstacles = obstaclesContainer.querySelectorAll('.obstacle');
    obstacles.forEach(obstacle => {
        const currentLeft = parseFloat(obstacle.style.left) || gameArea.offsetWidth;
        const newLeft = currentLeft - (5 * gameSpeed); // Base speed * game speed
        obstacle.style.left = `${newLeft}px`;
        
        // Check collision
        if (checkCollision(obstacle)) {
            endGame();
            return;
        }
        
        // Remove obstacle if off screen
        if (newLeft < -50) {
            obstacle.remove();
        }
    });
    
    // Handle jumping
    if (isJumping) {
        const jumpDuration = (now - jumpStartTime) / 1000;
        if (jumpDuration > 0.3) { // Jump duration
            isJumping = false;
            petCharacter.classList.remove('jumping');
        }
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function spawnObstacles() {
    if (!gameRunning) return;
    
    const obstacleTypes = ['wall', 'spike'];
    const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    const obstacle = document.createElement('div');
    obstacle.className = `obstacle ${randomType}`;
    obstacle.style.left = `${gameArea.offsetWidth}px`;
    obstaclesContainer.appendChild(obstacle);
    
    // Random spawn interval (1-3 seconds, adjusted for speed)
    const baseInterval = 1000 + Math.random() * 2000;
    const adjustedInterval = baseInterval / gameSpeed;
    
    obstacleSpawnTimer = setTimeout(() => {
        spawnObstacles();
    }, adjustedInterval);
}

function checkCollision(obstacle) {
    const petRect = petCharacter.getBoundingClientRect();
    const obstacleRect = obstacle.getBoundingClientRect();
    
    return !(
        petRect.right < obstacleRect.left ||
        petRect.left > obstacleRect.right ||
        petRect.bottom < obstacleRect.top ||
        petRect.top > obstacleRect.bottom
    );
}

function jump() {
    if (!gameRunning || isJumping) return;
    
    isJumping = true;
    jumpStartTime = Date.now();
    petCharacter.classList.add('jumping');
    
    setTimeout(() => {
        if (isJumping) {
            isJumping = false;
            petCharacter.classList.remove('jumping');
        }
    }, 300);
}

function endGame() {
    if (!gameRunning) return;
    
    gameRunning = false;
    
    // Stop timers
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (obstacleSpawnTimer) {
        clearTimeout(obstacleSpawnTimer);
    }
    
    statusMessage.textContent = `Game Over! You survived ${Math.floor(currentTime)} seconds and earned $${moneyEarned}!`;
    restartBtn.style.display = 'inline-block';
    
    // Send rewards and stat changes
    if (moneyEarned > 0) {
        ipcRenderer.send('game:reward', {
            money: moneyEarned,
            happiness: 0,
            experience: 0,
            hunger: -15,
            rest: -10
        });
    } else {
        // Still apply stat changes even if no money earned
        ipcRenderer.send('game:reward', {
            money: 0,
            happiness: 0,
            experience: 0,
            hunger: -15,
            rest: -10
        });
    }
}

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    obstaclesContainer.innerHTML = '';
    moneyEarned = 0;
    moneyDisplay.textContent = '$0';
    timerDisplay.textContent = '0:00';
    startGame();
});

// Jump controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameRunning) {
        e.preventDefault();
        jump();
    }
});

gameArea.addEventListener('click', () => {
    if (gameRunning) {
        jump();
    }
});

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

