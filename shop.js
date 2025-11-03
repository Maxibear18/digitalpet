window.addEventListener('DOMContentLoaded', () => {
    const tabs = Array.from(document.querySelectorAll('.shop-tab'));
    const panels = Array.from(document.querySelectorAll('.shop-panel'));

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
});


