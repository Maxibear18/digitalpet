const { ipcRenderer } = require('electron');

let currentMoney = 300; // Will be updated from main process

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
    });

    // Listen for purchase failures
    ipcRenderer.on('shop:purchaseFailed', (_event, data) => {
        if (data.reason === 'insufficient_funds') {
            alert(`Not enough money! You need $${data.cost} but only have $${data.current}.`);
        }
    });

    // Update buy button states based on money
    function updateBuyButtons() {
        buyButtons.forEach(btn => {
            const cost = parseInt(btn.dataset.cost) || 0;
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
            if (item === 'food1') {
                ipcRenderer.send('shop:buy', {
                    type: 'food',
                    id: 'food1',
                    imagePath: 'sprites/food/Food1.png'
                });
            } else if (item === 'medicine1') {
                ipcRenderer.send('shop:buy', {
                    type: 'medicine',
                    id: 'medicine1',
                    imagePath: 'sprites/pill.png'
                });
            } else if (item === 'medkit1') {
                ipcRenderer.send('shop:buy', {
                    type: 'medkit',
                    id: 'medkit1',
                    imagePath: 'sprites/medkit.png'
                });
            } else if (item === 'egg1') {
                ipcRenderer.send('shop:buy', {
                    type: 'egg',
                    id: 'egg1',
                    imagePath: 'sprites/eggs/digiegg1.png'
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
    const buyButtons = Array.from(document.querySelectorAll('.buy-btn'));
    buyButtons.forEach(btn => {
        const cost = parseInt(btn.dataset.cost) || 0;
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
});


