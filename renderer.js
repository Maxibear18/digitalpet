const pet = document.getElementById('pet');
const { ipcRenderer } = require('electron');

// Make the pet draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;

pet.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
    initialX = e.clientX;
    initialY = e.clientY;

    if (e.target === pet) {
        isDragging = true;
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX;
        currentY = e.clientY;

        // Move the entire window by communicating with main process
        ipcRenderer.invoke('move-window', { x: e.screenX - 75, y: e.screenY - 75 });
    }
}

function dragEnd(e) {
    isDragging = false;
}

