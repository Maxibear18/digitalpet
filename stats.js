window.addEventListener('DOMContentLoaded', () => {
    // Seed with 50/100 for all for now
    const defaultValue = 50;
    const cards = Array.from(document.querySelectorAll('.stat-card'));
    cards.forEach(card => {
        const fill = card.querySelector('.fill');
        const value = card.querySelector('.value');
        if (fill) fill.style.width = defaultValue + '%';
        if (value) value.textContent = `${defaultValue} / 100`;
    });
});


