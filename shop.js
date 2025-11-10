const { ipcRenderer } = require('electron');

let currentMoney = 1500; // Will be updated from main process
let hasPet = false; // Track if pet exists (egg hatched)

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
        tab.addEventListener('click', () => setActive(tab.dataset.tab));
    });

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
        updateEggButton();
    });

    // Update buy button states based on money
    function updateBuyButtons() {
        buyButtons.forEach(btn => {
            const cost = parseInt(btn.dataset.cost) || 0;
            const item = btn.dataset.item;
            
            // Disable egg button if pet already exists
            if (item === 'egg1' && hasPet) {
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
        const eggButton = buyButtons.find(btn => btn.dataset.item === 'egg1');
        if (eggButton) {
            if (hasPet) {
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
        }
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
                // Check if pet already exists
                if (hasPet) {
                    alert('You already have a pet! You cannot buy another egg.');
                    return;
                }
                ipcRenderer.send('shop:buy', {
                    type: 'egg',
                    id: 'egg1',
                    imagePath: 'sprites/eggs/digiegg1.png'
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
    
    // Request current money from main process
    ipcRenderer.send('money:request');
});

// Listen for money request response
ipcRenderer.on('money:response', (_event, amount) => {
    currentMoney = amount;
    updateBuyButtons();
    updateEggButton();
});


