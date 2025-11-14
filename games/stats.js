const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    // Seed with 100/100 for all stats
    const defaultValue = 100;
    const cards = Array.from(document.querySelectorAll('.stat-card'));
    cards.forEach(card => {
        const fill = card.querySelector('.fill');
        const value = card.querySelector('.value');
        if (fill) fill.style.width = defaultValue + '%';
        if (value) value.textContent = `${defaultValue} / 100`;
    });
});

ipcRenderer.on('stats:update', (_event, payload) => {
    if (!payload || !payload.key) return;
    const key = payload.key;
    const max = typeof payload.max === 'number' ? payload.max : 100;
    const valueNum = typeof payload.value === 'number' ? payload.value : 0;
    const percent = Math.max(0, Math.min(100, Math.round((valueNum / max) * 100)));

    const card = document.querySelector(`.stat-card[data-key="${key}"]`);
    if (!card) return;
    const fill = card.querySelector('.fill');
    const value = card.querySelector('.value');
    if (fill) fill.style.width = percent + '%';
    if (value) value.textContent = `${valueNum} / ${max}`;
});


