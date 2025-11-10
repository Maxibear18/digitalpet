const { ipcRenderer } = require('electron');

// Game state
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let mistakes = 0;
const MAX_MISTAKES = 5;
const TOTAL_PAIRS = 8;
let isPlaying = false;
let canFlip = true;

// DOM elements
const memoryGrid = document.getElementById('memoryGrid');
const startBtn = document.getElementById('startBtn');
const mistakesCountEl = document.getElementById('mistakesCount');
const matchesCountEl = document.getElementById('matchesCount');
const statusMessageEl = document.getElementById('statusMessage');
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpCloseBtn = document.getElementById('helpCloseBtn');

// Card images - mix of pets and food
const CARD_IMAGES = [
    // Pet sprites
    { type: 'pet', path: 'sprites/botamon/botamon.png', id: 'botamon' },
    { type: 'pet', path: 'sprites/poyomon/poyomon.png', id: 'poyomon' },
    { type: 'pet', path: 'sprites/punimon/punimon.png', id: 'punimon' },
    { type: 'pet', path: 'sprites/pitchmon/pitchmon.png', id: 'pitchmon' },
    // Food sprites
    { type: 'food', path: 'sprites/food/cherry.png', id: 'cherry' },
    { type: 'food', path: 'sprites/food/riceball.png', id: 'riceball' },
    { type: 'food', path: 'sprites/food/sandwich.png', id: 'sandwich' },
    { type: 'food', path: 'sprites/food/cake.png', id: 'cake' }
];

// Initialize game
function initGame() {
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    mistakes = 0;
    isPlaying = false;
    canFlip = true;
    
    memoryGrid.innerHTML = '';
    updateUI();
}

// Start game
function startGame() {
    initGame();
    isPlaying = true;
    createCards();
    shuffleCards();
    renderCards();
    updateUI();
    statusMessageEl.textContent = 'Click cards to flip and match pairs!';
    startBtn.disabled = true;
}

// Create card pairs
function createCards() {
    cards = [];
    // Create pairs for each image
    CARD_IMAGES.forEach((image, index) => {
        cards.push({ ...image, pairId: index });
        cards.push({ ...image, pairId: index });
    });
}

// Shuffle cards
function shuffleCards() {
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
}

// Render cards
function renderCards() {
    memoryGrid.innerHTML = '';
    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'memory-card';
        cardElement.dataset.index = index;
        cardElement.dataset.pairId = card.pairId;
        
        const front = document.createElement('div');
        front.className = 'memory-card-front';
        
        const back = document.createElement('div');
        back.className = 'memory-card-back';
        const img = document.createElement('img');
        img.src = card.path;
        img.alt = card.id;
        back.appendChild(img);
        
        cardElement.appendChild(front);
        cardElement.appendChild(back);
        
        cardElement.addEventListener('click', () => handleCardClick(index));
        
        memoryGrid.appendChild(cardElement);
    });
}

// Handle card click
function handleCardClick(index) {
    if (!isPlaying || !canFlip) return;
    
    const cardElement = memoryGrid.children[index];
    
    // Don't flip if already flipped or matched
    if (cardElement.classList.contains('flipped') || cardElement.classList.contains('matched')) {
        return;
    }
    
    // Don't flip if already have 2 cards flipped
    if (flippedCards.length >= 2) {
        return;
    }
    
    // Flip the card
    cardElement.classList.add('flipped');
    flippedCards.push({ index, pairId: cards[index].pairId, element: cardElement });
    
    // Check if we have 2 cards flipped
    if (flippedCards.length === 2) {
        canFlip = false;
        checkMatch();
    }
}

// Check if flipped cards match
function checkMatch() {
    const [card1, card2] = flippedCards;
    
    if (card1.pairId === card2.pairId) {
        // Match found!
        setTimeout(() => {
            card1.element.classList.add('matched');
            card2.element.classList.add('matched');
            card1.element.classList.remove('flipped');
            card2.element.classList.remove('flipped');
            
            matchedPairs++;
            flippedCards = [];
            canFlip = true;
            updateUI();
            
            // Check if game is won
            if (matchedPairs === TOTAL_PAIRS) {
                gameWon();
            }
        }, 500);
    } else {
        // No match - mistake!
        mistakes++;
        card1.element.classList.add('wrong');
        card2.element.classList.add('wrong');
        
        setTimeout(() => {
            card1.element.classList.remove('flipped', 'wrong');
            card2.element.classList.remove('flipped', 'wrong');
            flippedCards = [];
            canFlip = true;
            updateUI();
            
            // Check if game is lost
            if (mistakes >= MAX_MISTAKES) {
                gameLost();
            }
        }, 1000);
    }
}

// Game won
function gameWon() {
    isPlaying = false;
    canFlip = false;
    statusMessageEl.textContent = 'Congratulations! You matched all pairs!';
    
    // Disable all cards
    Array.from(memoryGrid.children).forEach(card => {
        card.classList.add('disabled');
    });
    
    // Send rewards: $50, +10 happiness, -5 sleep, -5 hunger, +15 exp
    ipcRenderer.send('game:reward', {
        money: 50,
        happiness: 10,
        experience: 15,
        hunger: -5,
        rest: -5
    });
    
    // Trigger pet happiness animation
    ipcRenderer.send('game:petHappy');
    
    startBtn.disabled = false;
}

// Game lost
function gameLost() {
    isPlaying = false;
    canFlip = false;
    statusMessageEl.textContent = `Game Over! You made ${mistakes} mistakes.`;
    
    // Disable all cards
    Array.from(memoryGrid.children).forEach(card => {
        card.classList.add('disabled');
    });
    
    // Calculate money: $3 per match made
    const moneyReward = matchedPairs * 3;
    
    // Send rewards: $3 per match, +5 happiness (halved from win), -5 sleep, -5 hunger, +7 exp
    // Win happiness is 10, so halved = 5
    ipcRenderer.send('game:reward', {
        money: moneyReward,
        happiness: 5,
        experience: 7,
        hunger: -5,
        rest: -5
    });
    
    startBtn.disabled = false;
}

// Update UI
function updateUI() {
    mistakesCountEl.textContent = `${mistakes} / ${MAX_MISTAKES}`;
    matchesCountEl.textContent = `${matchedPairs} / ${TOTAL_PAIRS}`;
    
    // Update mistakes color if close to limit
    if (mistakes >= MAX_MISTAKES - 1) {
        mistakesCountEl.style.color = '#ff4444';
    } else if (mistakes >= MAX_MISTAKES - 2) {
        mistakesCountEl.style.color = '#ffaa44';
    } else if (mistakes >= MAX_MISTAKES - 3) {
        mistakesCountEl.style.color = '#ffcc44';
    } else {
        mistakesCountEl.style.color = '#0f280c';
    }
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
});

helpBtn.addEventListener('click', openHelpModal);
helpCloseBtn.addEventListener('click', closeHelpModal);

// Close modal when clicking outside
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        closeHelpModal();
    }
});

// Initialize on load
initGame();

