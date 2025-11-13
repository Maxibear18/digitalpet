const { ipcRenderer } = require('electron');

let currentMoney = 1500; // Will be updated from main process
let hasPet = false; // Track if pet exists (egg hatched)
let hasEgg = false; // Track if player has purchased an egg
let shopPetType = 'botamon';
let shopEvolutionStage = 1;

window.addEventListener('DOMContentLoaded', () => {
    const tabs = Array.from(document.querySelectorAll('.shop-tab'));
    const panels = Array.from(document.querySelectorAll('.shop-panel'));
    const buyButtons = Array.from(document.querySelectorAll('.buy-btn'));

    function setActive(tabName) {
        tabs.forEach(t => {
            const isActive = t.dataset.tab === tabName;
            t.classList.toggle('is-active', isActive);
            t.setAttribute('aria-selected', String(isActive));
        });
        panels.forEach(p => {
            const isActive = p.dataset.panel === tabName;
            p.classList.toggle('is-active', isActive);
            p.hidden = !isActive;
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Prevent opening Sell tab if no pet
            if (tab.dataset.tab === 'sell' && !hasPet) return;
            setActive(tab.dataset.tab);
        });
    });

    // Sell tab elements
    const sellBtn = document.getElementById('sellBtn');
    const sellPriceEl = document.getElementById('sellPrice');
    const sellPetSprite = document.getElementById('sellPetSprite');

    function calcSellPrice(stage) {
        const base = 250;
        const multiplier = 1 + 0.2 * stage; // stage 1 = 1.2, stage 2 = 1.4, etc.
        return Math.floor(base * multiplier);
    }

    function getSellSpriteFor(typeKey, stage) {
        // Map minimal walk sprites for preview
        const baseBasic = 'sprites/basic pets';
        const baseInter = 'sprites/inter pets';
        const MAP = {
            botamon: [`${baseBasic}/botamon/botamon.png`],
            poyomon: [`${baseBasic}/poyomon/poyomon.png`],
            punimon: [`${baseBasic}/punimon/punimon.png`],
            pitchmon: [`${baseBasic}/pitchmon/pitchmon.png`],
            koromon: [`${baseBasic}/koromon/koromon.png`],
            tokomon: [`${baseBasic}/tokomon/tokomon.png`],
            tsunomon: [`${baseBasic}/tsunomon/tsunomon.png`],
            pakumon: [`${baseBasic}/pakumon/pakumon.png`],
            agumon: [`${baseBasic}/agumon/agumon.png`],
            betamon: [`${baseBasic}/betamon/betamon.png`],
            gabumon: [`${baseBasic}/gabumon/gabumon.png`],
            patamon: [`${baseBasic}/patamon/patamon.png`],
            greymon: [`${baseBasic}/greymon/greymon.png`],
            garurumon: [`${baseBasic}/garurumon/garurumon.png`],
            angemon: [`${baseBasic}/angemon/angemon.png`],
            seadramon: [`${baseBasic}/seadramon/seadramon.png`],
            giromon: [`${baseInter}/giromon/giromon.png`],
            zurumon: [`${baseInter}/zurumon/zurumon.png`],
            yuramon: [`${baseInter}/yuramon/yuramon.png`],
            pixiemon: [`${baseInter}/pixiemon/pixiemon.png`]
        };
        // Resolve evolved type by stage (same logic as games: follow evolution chain)
        const EVOLVE = {
            botamon: 'koromon',
            poyomon: 'tokomon',
            punimon: 'tsunomon',
            pitchmon: 'pakumon',
            koromon: 'agumon',
            tokomon: 'patamon',
            tsunomon: 'gabumon',
            pakumon: 'betamon',
            agumon: 'greymon',
            betamon: 'seadramon',
            gabumon: 'garurumon',
            patamon: 'angemon',
            giromon: 'gazimon', // Placeholder evolution - to be updated
            zurumon: 'pagumon', // Placeholder evolution - to be updated
            yuramon: 'tanemon', // Placeholder evolution - to be updated
            pixiemon: 'piyomon' // Placeholder evolution - to be updated
        };
        let resolved = typeKey;
        for (let s = 2; s <= stage; s++) {
            const next = EVOLVE[resolved];
            if (!next) break;
            resolved = next;
            // Add evolved intermediate pets to MAP if not already there
            if (resolved && !MAP[resolved]) {
                if (resolved === 'gazimon' || resolved === 'pagumon' || resolved === 'tanemon' || resolved === 'piyomon') {
                    MAP[resolved] = [`${baseInter}/${resolved}/${resolved}.png`];
                }
            }
        }
        const arr = MAP[resolved] || MAP.botamon;
        return encodeURI(arr[0]);
    }

    function refreshSellPanel() {
        // Disable sell if no pet
        if (!hasPet) {
            // Visually disable Sell tab
            const sellTab = tabs.find(t => t.dataset.tab === 'sell');
            if (sellTab) {
                sellTab.setAttribute('aria-disabled', 'true');
                sellTab.style.opacity = '0.5';
                sellTab.style.cursor = 'not-allowed';
            }
            if (sellBtn) sellBtn.disabled = true;
            if (sellPriceEl) sellPriceEl.textContent = '$0';
            if (sellPetSprite) sellPetSprite.src = '';
            return;
        }
        const sellTab = tabs.find(t => t.dataset.tab === 'sell');
        if (sellTab) {
            sellTab.removeAttribute('aria-disabled');
            sellTab.style.opacity = '1';
            sellTab.style.cursor = 'pointer';
        }
        const price = calcSellPrice(shopEvolutionStage);
        if (sellPriceEl) sellPriceEl.textContent = `$${price}`;
        if (sellPetSprite) sellPetSprite.src = getSellSpriteFor(shopPetType, shopEvolutionStage);
        if (sellBtn) sellBtn.disabled = false;
    }

    if (sellBtn) {
        sellBtn.addEventListener('click', () => {
            if (!hasPet) return;
            const price = calcSellPrice(shopEvolutionStage);
            const ok = confirm(`Are you sure you want to sell your pet for $${price}? This cannot be undone.`);
            if (!ok) return;
            ipcRenderer.send('shop:sellPet', { price });
        });
    }

    // Listen for money updates
    ipcRenderer.on('money:update', (_event, amount) => {
        currentMoney = amount;
        updateBuyButtons();
        updateEggButton(); // Also update egg button specifically
    });

    // Listen for purchase failures
    ipcRenderer.on('shop:purchaseFailed', (_event, data) => {
        if (data.reason === 'insufficient_funds') {
            alert(`Not enough money! You need $${data.cost} but only have $${data.current}.`);
        } else if (data.reason === 'pet_exists') {
            alert('You already have a pet! You cannot buy another egg.');
        }
    });
    
    // Listen for pet state updates (to enable/disable egg button)
    ipcRenderer.on('pet:stateUpdate', (_event, data) => {
        hasPet = data.isEggHatched || false;
        hasEgg = data.hasEgg || false;
        updateEggButton();
        // If provided, update pet type and evolution stage
        if (typeof data.petType === 'string') shopPetType = data.petType;
        if (typeof data.evolutionStage === 'number') shopEvolutionStage = data.evolutionStage;
        refreshSellPanel();
    });

    // Receive pet type and evolution stage for sell tab
    ipcRenderer.on('shop:petType', (_event, petType, evolutionStage) => {
        if (typeof petType === 'string') shopPetType = petType;
        if (typeof evolutionStage === 'number') shopEvolutionStage = evolutionStage;
        refreshSellPanel();
    });

    // Update buy button states based on money
    function updateBuyButtons() {
        buyButtons.forEach(btn => {
            const cost = parseInt(btn.dataset.cost) || 0;
            const item = btn.dataset.item;
            
            // Disable egg button if pet already exists
            if ((item === 'egg1' || item === 'eggInter') && hasPet) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                return;
            }
            
            if (currentMoney < cost) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }
    
    // Update egg button specifically
    function updateEggButton() {
        const eggButtons = buyButtons.filter(btn => btn.dataset.item === 'egg1' || btn.dataset.item === 'eggInter');
        eggButtons.forEach(eggButton => {
            if (hasPet || hasEgg) {
                eggButton.disabled = true;
                eggButton.style.opacity = '0.5';
                eggButton.style.cursor = 'not-allowed';
            } else {
                const cost = parseInt(eggButton.dataset.cost) || 0;
                if (currentMoney < cost) {
                    eggButton.disabled = true;
                    eggButton.style.opacity = '0.5';
                    eggButton.style.cursor = 'not-allowed';
                } else {
                    eggButton.disabled = false;
                    eggButton.style.opacity = '1';
                    eggButton.style.cursor = 'pointer';
                }
            }
        });
    }

    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.dataset.item;
            const cost = parseInt(btn.dataset.cost) || 0;
            
            // Check if player has enough money (client-side check)
            if (currentMoney < cost) {
                alert(`Not enough money! You need $${cost} but only have $${currentMoney}.`);
                return;
            }
            
            // Send purchase request to main process
            if (item === 'cherry') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'cherry',
                    foodType: 'cherry',
                    foodCost: cost,
                    imagePath: 'sprites/food/cherry.png'
                });
            } else if (item === 'riceball') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'riceball',
                    foodType: 'riceball',
                    foodCost: cost,
                    imagePath: 'sprites/food/riceball.png'
                });
            } else if (item === 'sandwich') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'sandwich',
                    foodType: 'sandwich',
                    foodCost: cost,
                    imagePath: 'sprites/food/sandwich.png'
                });
            } else if (item === 'meat') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'meat',
                    foodType: 'meat',
                    foodCost: cost,
                    imagePath: 'sprites/food/Food1.png'
                });
            } else if (item === 'cake') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'cake',
                    foodType: 'cake',
                    foodCost: cost,
                    imagePath: 'sprites/food/cake.png'
                });
            } else if (item === 'icecream') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'icecream',
                    foodType: 'icecream',
                    foodCost: cost,
                    imagePath: 'sprites/food/ice cream.png'
                });
            } else if (item === 'coffee') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'coffee',
                    foodType: 'coffee',
                    foodCost: cost,
                    imagePath: 'sprites/food/coffee.png'
                });
            } else if (item === 'medicine1') {
                ipcRenderer.send('shop:buy', {
                    type: 'medicine',
                    id: 'medicine1',
                    medicineCost: cost,
                    imagePath: 'sprites/items/pill.png'
                });
            } else if (item === 'medkit1') {
                ipcRenderer.send('shop:buy', {
                    type: 'medkit',
                    id: 'medkit1',
                    medkitCost: cost,
                    imagePath: 'sprites/items/medkit.png'
                });
            } else if (item === 'egg1') {
                // Check if pet already exists or egg already purchased
                if (hasPet || hasEgg) {
                    alert('You already have an egg or pet! You cannot buy another egg.');
                    return;
                }
                ipcRenderer.send('shop:buy', {
                    type: 'egg',
                    id: 'egg1',
                    imagePath: 'sprites/eggs/digiegg1.png'
                });
            } else if (item === 'eggInter') {
                // Check if pet already exists or egg already purchased
                if (hasPet || hasEgg) {
                    alert('You already have an egg or pet! You cannot buy another egg.');
                    return;
                }
                ipcRenderer.send('shop:buy', {
                    type: 'egg',
                    id: 'eggInter',
                    imagePath: 'sprites/eggs/digiegg inter.png'
                });
            } else if (item === 'bubblewand') {
                ipcRenderer.send('shop:buy', {
                    type: 'toy',
                    id: 'bubblewand',
                    toyCost: cost,
                    imagePath: 'sprites/toys/Bubble Wand.png'
                });
            } else if (item === 'calculator') {
                ipcRenderer.send('shop:buy', {
                    type: 'toy',
                    id: 'calculator',
                    toyCost: cost,
                    imagePath: 'sprites/toys/Calculator.png'
                });
            } else if (item === 'chimes') {
                ipcRenderer.send('shop:buy', {
                    type: 'toy',
                    id: 'chimes',
                    toyCost: cost,
                    imagePath: 'sprites/toys/Chimes.png'
                });
            } else if (item === 'musicplayer') {
                ipcRenderer.send('shop:buy', {
                    type: 'toy',
                    id: 'musicplayer',
                    toyCost: cost,
                    imagePath: 'sprites/toys/Music Player.png'
                });
            } else if (item === 'paddle') {
                ipcRenderer.send('shop:buy', {
                    type: 'toy',
                    id: 'paddle',
                    toyCost: cost,
                    imagePath: 'sprites/toys/Paddle.png'
                });
            } else if (item === 'pudding') {
                ipcRenderer.send('shop:buy', {
                    type: 'toy',
                    id: 'pudding',
                    toyCost: cost,
                    imagePath: 'sprites/toys/Pudding.png'
                });
            }
        });
    });

    // Initial update
    updateBuyButtons();
    refreshSellPanel();
    
    // Request current money from main process
    ipcRenderer.send('money:request');
    // Request current pet type/stage
    ipcRenderer.send('shop:requestPetType');
});

// Listen for money request response
ipcRenderer.on('money:response', (_event, amount) => {
    currentMoney = amount;
    updateBuyButtons();
    updateEggButton();
});


