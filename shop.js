const { ipcRenderer } = require('electron');

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

    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.dataset.item;
            // For now map item keys to image paths
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
            }
        });
    });
});


