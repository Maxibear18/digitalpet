const { ipcRenderer } = require('electron');
const path = require('path');

// Store app path from main process
let appPath = process.cwd();

ipcRenderer.once('game:appPath', (_event, receivedAppPath) => {
    appPath = receivedAppPath;
});

// Helper function to resolve sprite paths correctly
function resolveSpritePath(relativePath) {
    const cleanPath = relativePath.replace(/^\.\.\/\.\.\//, '').replace(/^\.\.\//, '');
    const absolutePath = path.resolve(appPath, cleanPath);
    const normalizedPath = absolutePath.replace(/\\/g, '/');
    return 'file:///' + normalizedPath;
}

let playerMoney = 0;
let correctCount = 0;
let currentLevel = 1;
let currentProblem = null;
let timerInterval = null;
let timeLeft = 15;
let gameActive = false;
let earnedMoney = 0;
let mistakesCount = 0;
let maxMistakes = 3;

// Pet animation state
let petHappinessSpriteIndex = 0;
let petHappinessInterval = null;
let isPetCheering = false;
let petType = 'botamon';
let evolutionStage = 1;

const problemText = document.getElementById('problemText');
const timerDisplay = document.getElementById('timerDisplay');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const startBtn = document.getElementById('startBtn');
const resultMessage = document.getElementById('resultMessage');
const correctCountDisplay = document.getElementById('correctCount');
const mistakesCountDisplay = document.getElementById('mistakesCount');
const levelDisplay = document.getElementById('levelDisplay');
const playerMoneyDisplay = document.getElementById('playerMoney');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const petSpriteEl = document.getElementById('petSprite');
const petBubbleEl = document.querySelector('.pet-bubble');

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
    updatePetSprite();
});

// Generate math problem based on level
function generateProblem() {
    const level = Math.floor(correctCount / 3) + 1;
    currentLevel = level;
    
    let num1, num2, operator, answer;
    
    if (level === 1) {
        // Level 1: Simple addition/subtraction (1-20)
        operator = Math.random() < 0.5 ? '+' : '-';
        num1 = Math.floor(Math.random() * 20) + 1;
        if (operator === '+') {
            num2 = Math.floor(Math.random() * 20) + 1;
            answer = num1 + num2;
        } else {
            num2 = Math.floor(Math.random() * num1) + 1;
            answer = num1 - num2;
        }
    } else if (level === 2) {
        // Level 2: Addition/subtraction (1-50)
        operator = Math.random() < 0.5 ? '+' : '-';
        num1 = Math.floor(Math.random() * 50) + 1;
        if (operator === '+') {
            num2 = Math.floor(Math.random() * 50) + 1;
            answer = num1 + num2;
        } else {
            num2 = Math.floor(Math.random() * num1) + 1;
            answer = num1 - num2;
        }
    } else if (level === 3) {
        // Level 3: Addition/subtraction/multiplication (1-100)
        const opRand = Math.random();
        if (opRand < 0.4) {
            operator = '+';
            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * 100) + 1;
            answer = num1 + num2;
        } else if (opRand < 0.8) {
            operator = '-';
            num1 = Math.floor(Math.random() * 100) + 1;
            num2 = Math.floor(Math.random() * num1) + 1;
            answer = num1 - num2;
        } else {
            operator = '×';
            num1 = Math.floor(Math.random() * 12) + 1;
            num2 = Math.floor(Math.random() * 12) + 1;
            answer = num1 * num2;
        }
    } else if (level === 4) {
        // Level 4: All operations, larger numbers
        const opRand = Math.random();
        if (opRand < 0.3) {
            operator = '+';
            num1 = Math.floor(Math.random() * 200) + 1;
            num2 = Math.floor(Math.random() * 200) + 1;
            answer = num1 + num2;
        } else if (opRand < 0.6) {
            operator = '-';
            num1 = Math.floor(Math.random() * 200) + 1;
            num2 = Math.floor(Math.random() * num1) + 1;
            answer = num1 - num2;
        } else if (opRand < 0.9) {
            operator = '×';
            num1 = Math.floor(Math.random() * 20) + 1;
            num2 = Math.floor(Math.random() * 20) + 1;
            answer = num1 * num2;
        } else {
            operator = '÷';
            num2 = Math.floor(Math.random() * 12) + 1;
            answer = Math.floor(Math.random() * 12) + 1;
            num1 = num2 * answer;
        }
    } else {
        // Level 5+: Complex problems
        const opRand = Math.random();
        if (opRand < 0.25) {
            operator = '+';
            num1 = Math.floor(Math.random() * 500) + 1;
            num2 = Math.floor(Math.random() * 500) + 1;
            answer = num1 + num2;
        } else if (opRand < 0.5) {
            operator = '-';
            num1 = Math.floor(Math.random() * 500) + 1;
            num2 = Math.floor(Math.random() * num1) + 1;
            answer = num1 - num2;
        } else if (opRand < 0.75) {
            operator = '×';
            num1 = Math.floor(Math.random() * 30) + 1;
            num2 = Math.floor(Math.random() * 30) + 1;
            answer = num1 * num2;
        } else {
            operator = '÷';
            num2 = Math.floor(Math.random() * 15) + 1;
            answer = Math.floor(Math.random() * 15) + 1;
            num1 = num2 * answer;
        }
    }
    
    currentProblem = { num1, num2, operator, answer };
    problemText.textContent = `${num1} ${operator} ${num2} = ?`;
    return currentProblem;
}

function startGame() {
    gameActive = true;
    correctCount = 0;
    mistakesCount = 0;
    earnedMoney = 0;
    currentLevel = 1;
    timeLeft = 15;
    
    startBtn.disabled = true;
    answerInput.disabled = false;
    submitBtn.disabled = false;
    answerInput.focus();
    
    resultMessage.textContent = 'Solve the problem!';
    resultMessage.className = 'result-message';
    
    generateProblem();
    startTimer();
    updateDisplay();
}

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function submitAnswer() {
    if (!gameActive || !currentProblem) return;
    
    const userAnswer = parseInt(answerInput.value);
    
    if (isNaN(userAnswer)) {
        resultMessage.textContent = 'Please enter a valid number!';
        resultMessage.className = 'result-message';
        return;
    }
    
    if (userAnswer === currentProblem.answer) {
        // Correct answer
        correctCount++;
        timeLeft = 15; // Reset timer
        timerDisplay.textContent = timeLeft;
        
        // Restart timer
        stopTimer();
        startTimer();
        
        // Check if we've reached a multiple of 3
        if (correctCount % 3 === 0) {
            earnedMoney += 12;
            resultMessage.textContent = `Correct! +$12 (Total: $${earnedMoney})`;
            resultMessage.className = 'result-message win';
        } else {
            resultMessage.textContent = 'Correct!';
            resultMessage.className = 'result-message win';
        }
        
        // Trigger pet celebration
        makePetCheer();
        ipcRenderer.send('game:petHappy');
        
        updateDisplay();
        
        // Generate new problem
        setTimeout(() => {
            if (gameActive) {
                generateProblem();
                answerInput.value = '';
                answerInput.focus();
                resultMessage.textContent = 'Solve the problem!';
                resultMessage.className = 'result-message';
            }
        }, 1000);
    } else {
        // Wrong answer - increment mistakes
        mistakesCount++;
        updateDisplay();
        
        if (mistakesCount >= maxMistakes) {
            // Out of mistakes - end game
            endGame(false);
        } else {
            // Still have mistakes left - continue
            resultMessage.textContent = `Wrong! ${maxMistakes - mistakesCount} mistake(s) remaining.`;
            resultMessage.className = 'result-message lose';
            
            // Reset timer and continue
            timeLeft = 15;
            timerDisplay.textContent = timeLeft;
            stopTimer();
            startTimer();
            
            setTimeout(() => {
                if (gameActive) {
                    generateProblem();
                    answerInput.value = '';
                    answerInput.focus();
                    resultMessage.textContent = 'Solve the problem!';
                    resultMessage.className = 'result-message';
                }
            }, 1500);
        }
    }
}

function endGame(won) {
    gameActive = false;
    stopTimer();
    
    startBtn.disabled = false;
    answerInput.disabled = true;
    submitBtn.disabled = true;
    
    // Add earned money to player money
    if (earnedMoney > 0) {
        playerMoney += earnedMoney;
        updateMoney();
    }
    
    // Send rewards to main process
    ipcRenderer.send('game:reward', {
        money: earnedMoney,
        happiness: 10,
        experience: 10,
        rest: -10, // Lose 10 sleep
        hunger: -5 // Lose 5 hunger
    });
    
    if (mistakesCount >= maxMistakes) {
        resultMessage.textContent = `Game Over! You made ${maxMistakes} mistakes. You got ${correctCount} correct and earned $${earnedMoney}.`;
    } else {
        resultMessage.textContent = `Game Over! You got ${correctCount} correct and earned $${earnedMoney}.`;
    }
    resultMessage.className = 'result-message';
    
    problemText.textContent = 'Game Over!';
    answerInput.value = '';
}

function updateDisplay() {
    playerMoneyDisplay.textContent = `$${playerMoney}`;
    correctCountDisplay.textContent = correctCount;
    mistakesCountDisplay.textContent = `${mistakesCount} / ${maxMistakes}`;
    levelDisplay.textContent = currentLevel;
}

function updateMoney() {
    ipcRenderer.send('money:update', playerMoney);
}

// Event listeners
startBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', submitAnswer);

answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && gameActive) {
        submitAnswer();
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

// Update pet sprite based on type and evolution stage
function updatePetSprite() {
    const PET_TYPES = {
        botamon: {
            walk: ['../../sprites/basic pets/botamon/botamon.png', '../../sprites/basic pets/botamon/botamon 2.png'],
            happiness: ['../../sprites/basic pets/botamon/botamon.png', '../../sprites/basic pets/botamon/botamon 3.png'],
            sleep: '../../sprites/basic pets/botamon/botamon 4.png',
            canEvolve: true,
            evolution: 'koromon'
        },
        poyomon: {
            walk: ['../../sprites/basic pets/poyomon/poyomon.png', '../../sprites/basic pets/poyomon/poyomon 2.png'],
            happiness: ['../../sprites/basic pets/poyomon/poyomon.png', '../../sprites/basic pets/poyomon/poyomon 3.png'],
            sleep: '../../sprites/basic pets/poyomon/poyomon 4.png',
            canEvolve: true,
            evolution: 'tokomon'
        },
        punimon: {
            walk: ['../../sprites/basic pets/punimon/punimon.png', '../../sprites/basic pets/punimon/punimon 2.png'],
            happiness: ['../../sprites/basic pets/punimon/punimon.png', '../../sprites/basic pets/punimon/punimon 3.png'],
            sleep: '../../sprites/basic pets/punimon/punimon 4.png',
            canEvolve: true,
            evolution: 'tsunomon'
        },
        pitchmon: {
            walk: ['../../sprites/basic pets/pitchmon/pitchmon.png', '../../sprites/basic pets/pitchmon/pitchmon 2.png'],
            happiness: ['../../sprites/basic pets/pitchmon/pitchmon.png', '../../sprites/basic pets/pitchmon/pitchmon 3.png'],
            sleep: '../../sprites/basic pets/pitchmon/pitchmon 4.png',
            canEvolve: true,
            evolution: 'pakumon'
        },
        koromon: {
            walk: ['../../sprites/basic pets/koromon/koromon.png', '../../sprites/basic pets/koromon/koromon 2.png'],
            happiness: ['../../sprites/basic pets/koromon/koromon.png', '../../sprites/basic pets/koromon/koromon 3.png'],
            sleep: '../../sprites/basic pets/koromon/koromon 4.png',
            canEvolve: true,
            evolution: 'agumon'
        },
        tokomon: {
            walk: ['../../sprites/basic pets/tokomon/tokomon.png', '../../sprites/basic pets/tokomon/tokomon 2.png'],
            happiness: ['../../sprites/basic pets/tokomon/tokomon.png', '../../sprites/basic pets/tokomon/tokomon 3.png'],
            sleep: '../../sprites/basic pets/tokomon/tokomon 4.png',
            canEvolve: true,
            evolution: 'patamon'
        },
        tsunomon: {
            walk: ['../../sprites/basic pets/tsunomon/tsunomon.png', '../../sprites/basic pets/tsunomon/tsunomon 2.png'],
            happiness: ['../../sprites/basic pets/tsunomon/tsunomon.png', '../../sprites/basic pets/tsunomon/tsunomon 3.png'],
            sleep: '../../sprites/basic pets/tsunomon/tsunomon 4.png',
            canEvolve: true,
            evolution: 'gabumon'
        },
        pakumon: {
            walk: ['../../sprites/basic pets/pakumon/pakumon.png', '../../sprites/basic pets/pakumon/pakumon 2.png'],
            happiness: ['../../sprites/basic pets/pakumon/pakumon.png', '../../sprites/basic pets/pakumon/pakumon 3.png'],
            sleep: '../../sprites/basic pets/pakumon/pakumon 4.png',
            canEvolve: true,
            evolution: 'betamon'
        },
        agumon: {
            walk: ['../../sprites/basic pets/agumon/agumon.png', '../../sprites/basic pets/agumon/agumon 2.png'],
            happiness: ['../../sprites/basic pets/agumon/agumon.png', '../../sprites/basic pets/agumon/agumon 3.png'],
            sleep: '../../sprites/basic pets/agumon/agumon 4.png',
            canEvolve: true,
            evolution: 'greymon'
        },
        betamon: {
            walk: ['../../sprites/basic pets/betamon/betamon.png', '../../sprites/basic pets/betamon/betamon 2.png'],
            happiness: ['../../sprites/basic pets/betamon/betamon.png', '../../sprites/basic pets/betamon/betamon 3.png'],
            sleep: '../../sprites/basic pets/betamon/betamon 4.png',
            canEvolve: true,
            evolution: 'seadramon'
        },
        gabumon: {
            walk: ['../../sprites/basic pets/gabumon/gabumon.png', '../../sprites/basic pets/gabumon/gabumon 2.png'],
            happiness: ['../../sprites/basic pets/gabumon/gabumon.png', '../../sprites/basic pets/gabumon/gabumon 3.png'],
            sleep: '../../sprites/basic pets/gabumon/gabumon 4.png',
            canEvolve: true,
            evolution: 'garurumon'
        },
        patamon: {
            walk: ['../../sprites/basic pets/patamon/patamon.png', '../../sprites/basic pets/patamon/patamon 2.png'],
            happiness: ['../../sprites/basic pets/patamon/patamon.png', '../../sprites/basic pets/patamon/patamon 3.png'],
            sleep: '../../sprites/basic pets/patamon/patamon 4.png',
            canEvolve: true,
            evolution: 'angemon'
        },
        greymon: {
            walk: ['../../sprites/basic pets/greymon/greymon.png', '../../sprites/basic pets/greymon/greymon 2.png'],
            happiness: ['../../sprites/basic pets/greymon/greymon.png', '../../sprites/basic pets/greymon/greymon 3.png'],
            sleep: '../../sprites/basic pets/greymon/greymon 4.png',
            canEvolve: false
        },
        garurumon: {
            walk: ['../../sprites/basic pets/garurumon/garurumon.png', '../../sprites/basic pets/garurumon/garurumon 2.png'],
            happiness: ['../../sprites/basic pets/garurumon/garurumon.png', '../../sprites/basic pets/garurumon/garurumon 3.png'],
            sleep: '../../sprites/basic pets/garurumon/garurumon 4.png',
            canEvolve: false
        },
        angemon: {
            walk: ['../../sprites/basic pets/angemon/angemon.png', '../../sprites/basic pets/angemon/angemon 2.png'],
            happiness: ['../../sprites/basic pets/angemon/angemon.png', '../../sprites/basic pets/angemon/angemon 3.png'],
            sleep: '../../sprites/basic pets/angemon/angemon 4.png',
            canEvolve: false
        },
        seadramon: {
            walk: ['../../sprites/basic pets/seadramon/seadramon.png', '../../sprites/basic pets/seadramon/seadramon 2.png'],
            happiness: ['../../sprites/basic pets/seadramon/seadramon.png', '../../sprites/basic pets/seadramon/seadramon 3.png'],
            sleep: '../../sprites/basic pets/seadramon/seadramon 4.png',
            canEvolve: false
        },
        giromon: {
            walk: ['../../sprites/inter pets/giromon/giromon.png', '../../sprites/inter pets/giromon/giromon 2.png'],
            happiness: ['../../sprites/inter pets/giromon/giromon.png', '../../sprites/inter pets/giromon/giromon 3.png'],
            sleep: '../../sprites/inter pets/giromon/giromon 4.png',
            canEvolve: true,
            evolution: 'mamemon'
        },
        zurumon: {
            walk: ['../../sprites/inter pets/zurumon/zurumon.png', '../../sprites/inter pets/zurumon/zurumon 2.png'],
            happiness: ['../../sprites/inter pets/zurumon/zurumon.png', '../../sprites/inter pets/zurumon/zurumon 3.png'],
            sleep: '../../sprites/inter pets/zurumon/zurumon 4.png',
            canEvolve: true,
            evolution: 'pagumon'
        },
        yuramon: {
            walk: ['../../sprites/inter pets/yuramon/yuramon.png', '../../sprites/inter pets/yuramon/yuramon 2.png'],
            happiness: ['../../sprites/inter pets/yuramon/yuramon.png', '../../sprites/inter pets/yuramon/yuramon 3.png'],
            sleep: '../../sprites/inter pets/yuramon/yuramon 4.png',
            canEvolve: true,
            evolution: 'tanemon'
        },
        pixiemon: {
            walk: ['../../sprites/inter pets/pixiemon/pixiemon.png', '../../sprites/inter pets/pixiemon/pixiemon 2.png'],
            happiness: ['../../sprites/inter pets/pixiemon/pixiemon.png', '../../sprites/inter pets/pixiemon/pixiemon 3.png'],
            sleep: '../../sprites/inter pets/pixiemon/pixiemon 4.png',
            canEvolve: true,
            evolution: 'flymon'
        },
        pagumon: {
            walk: ['../../sprites/inter pets/pagumon/pagumon.png', '../../sprites/inter pets/pagumon/pagumon 2.png'],
            happiness: ['../../sprites/inter pets/pagumon/pagumon.png', '../../sprites/inter pets/pagumon/pagumon 3.png'],
            sleep: '../../sprites/inter pets/pagumon/pagumon 4.png',
            canEvolve: true,
            evolution: 'gazimon'
        },
        gazimon: {
            walk: ['../../sprites/inter pets/gazimon/gazimon.png', '../../sprites/inter pets/gazimon/gazimon 2.png'],
            happiness: ['../../sprites/inter pets/gazimon/gazimon.png', '../../sprites/inter pets/gazimon/gazimon 3.png'],
            sleep: '../../sprites/inter pets/gazimon/gazimon 4.png',
            canEvolve: true,
            evolution: 'gizamon'
        },
        gizamon: {
            walk: ['../../sprites/inter pets/gizamon/gizamon.png', '../../sprites/inter pets/gizamon/gizamon 2.png'],
            happiness: ['../../sprites/inter pets/gizamon/gizamon.png', '../../sprites/inter pets/gizamon/gizamon 3.png'],
            sleep: '../../sprites/inter pets/gizamon/gizamon 4.png',
            canEvolve: false
        },
        tanemon: {
            walk: ['../../sprites/inter pets/tanemon/tanemon.png', '../../sprites/inter pets/tanemon/tanemon 2.png'],
            happiness: ['../../sprites/inter pets/tanemon/tanemon.png', '../../sprites/inter pets/tanemon/tanemon 3.png'],
            sleep: '../../sprites/inter pets/tanemon/tanemon 4.png',
            canEvolve: true,
            evolution: 'palmon'
        },
        palmon: {
            walk: ['../../sprites/inter pets/palmon/palmon.png', '../../sprites/inter pets/palmon/palmon 2.png'],
            happiness: ['../../sprites/inter pets/palmon/palmon.png', '../../sprites/inter pets/palmon/palmon 3.png'],
            sleep: '../../sprites/inter pets/palmon/palmon 4.png',
            canEvolve: true,
            evolution: 'vegimon'
        },
        vegimon: {
            walk: ['../../sprites/inter pets/vegimon/vegimon.png', '../../sprites/inter pets/vegimon/vegimon 2.png'],
            happiness: ['../../sprites/inter pets/vegimon/vegimon.png', '../../sprites/inter pets/vegimon/vegimon 3.png'],
            sleep: '../../sprites/inter pets/vegimon/vegimon 4.png',
            canEvolve: false
        },
        mamemon: {
            walk: ['../../sprites/inter pets/mamemon/mamemon.png', '../../sprites/inter pets/mamemon/mamemon 2.png'],
            happiness: ['../../sprites/inter pets/mamemon/mamemon.png', '../../sprites/inter pets/mamemon/mamemon 3.png'],
            sleep: '../../sprites/inter pets/mamemon/mamemon 4.png',
            canEvolve: true,
            evolution: 'monzaemon'
        },
        monzaemon: {
            walk: ['../../sprites/inter pets/monzaemon/monzaemon.png', '../../sprites/inter pets/monzaemon/monzaemon 2.png'],
            happiness: ['../../sprites/inter pets/monzaemon/monzaemon.png', '../../sprites/inter pets/monzaemon/monzaemon 3.png'],
            sleep: '../../sprites/inter pets/monzaemon/monzaemon 4.png',
            canEvolve: true,
            evolution: 'yukidarumon'
        },
        yukidarumon: {
            walk: ['../../sprites/inter pets/yukidramon/yukidarumon.png', '../../sprites/inter pets/yukidramon/yukidarumon 2.png'],
            happiness: ['../../sprites/inter pets/yukidramon/yukidarumon.png', '../../sprites/inter pets/yukidramon/yukidarumon 3.png'],
            sleep: '../../sprites/inter pets/yukidramon/yukidarumon 4.png',
            canEvolve: false
        },
        flymon: {
            walk: ['../../sprites/inter pets/flymon/flymon.png', '../../sprites/inter pets/flymon/flymon 2.png'],
            happiness: ['../../sprites/inter pets/flymon/flymon.png', '../../sprites/inter pets/flymon/flymon 3.png'],
            sleep: '../../sprites/inter pets/flymon/flymon 4.png',
            canEvolve: true,
            evolution: 'piyomon'
        },
        piyomon: {
            walk: ['../../sprites/inter pets/piyomon/piyomon.png', '../../sprites/inter pets/piyomon/piyomon 2.png'],
            happiness: ['../../sprites/inter pets/piyomon/piyomon.png', '../../sprites/inter pets/piyomon/piyomon 3.png'],
            sleep: '../../sprites/inter pets/piyomon/piyomon 4.png',
            canEvolve: true,
            evolution: 'birdramon'
        },
        birdramon: {
            walk: ['../../sprites/inter pets/birdramon/birdramon.png', '../../sprites/inter pets/birdramon/birdramon 2.png'],
            happiness: ['../../sprites/inter pets/birdramon/birdramon.png', '../../sprites/inter pets/birdramon/birdramon 3.png'],
            sleep: '../../sprites/inter pets/birdramon/birdramon 4.png',
            canEvolve: false
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
        petSpriteEl.src = resolveSpritePath(petData.walk[0]); // Use first walk sprite
        // Store happiness sprites for cheering animation
        petSpriteEl.dataset.happinessSprites = JSON.stringify(petData.happiness);
    }
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
        petSpriteEl.src = resolveSpritePath(happinessSprites[petHappinessSpriteIndex]);
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
            botamon: { walk: ['../../sprites/basic pets/botamon/botamon.png', '../../sprites/basic pets/botamon/botamon 2.png'] },
            poyomon: { walk: ['../../sprites/basic pets/poyomon/poyomon.png', '../../sprites/basic pets/poyomon/poyomon 2.png'] },
            punimon: { walk: ['../../sprites/basic pets/punimon/punimon.png', '../../sprites/basic pets/punimon/punimon 2.png'] },
            pitchmon: { walk: ['../../sprites/basic pets/pitchmon/pitchmon.png', '../../sprites/basic pets/pitchmon/pitchmon 2.png'] },
            koromon: { walk: ['../../sprites/basic pets/koromon/koromon.png', '../../sprites/basic pets/koromon/koromon 2.png'] },
            tokomon: { walk: ['../../sprites/basic pets/tokomon/tokomon.png', '../../sprites/basic pets/tokomon/tokomon 2.png'] },
            tsunomon: { walk: ['../../sprites/basic pets/tsunomon/tsunomon.png', '../../sprites/basic pets/tsunomon/tsunomon 2.png'] },
            pakumon: { walk: ['../../sprites/basic pets/pakumon/pakumon.png', '../../sprites/basic pets/pakumon/pakumon 2.png'] },
            agumon: { walk: ['../../sprites/basic pets/agumon/agumon.png', '../../sprites/basic pets/agumon/agumon 2.png'] },
            betamon: { walk: ['../../sprites/basic pets/betamon/betamon.png', '../../sprites/basic pets/betamon/betamon 2.png'] },
            gabumon: { walk: ['../../sprites/basic pets/gabumon/gabumon.png', '../../sprites/basic pets/gabumon/gabumon 2.png'] },
            patamon: { walk: ['../../sprites/basic pets/patamon/patamon.png', '../../sprites/basic pets/patamon/patamon 2.png'] }
        };
        // Get current pet type from sprite src
        const currentSrc = petSpriteEl.src;
        for (const [type, data] of Object.entries(PET_TYPES)) {
            if (currentSrc.includes(type)) {
                petSpriteEl.src = resolveSpritePath(data.walk[0]);
                break;
            }
        }
        isPetCheering = false;
    }, 1800); // Match animation duration (3 cycles * 2 sprites * 200ms + buffer)
}

// Initialize display
updateDisplay();
updatePetSprite();

