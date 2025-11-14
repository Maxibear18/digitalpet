const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('pet-name-input');
    const submitButton = document.getElementById('submit-button');
    const errorMessage = document.getElementById('error-message');

    // Handle Enter key press
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitName();
        }
    });

    // Handle submit button click
    submitButton.addEventListener('click', () => {
        submitName();
    });

    function submitName() {
        const name = nameInput.value.trim();
        
        // Validate name
        if (!name) {
            errorMessage.textContent = 'Please enter a name!';
            nameInput.focus();
            return;
        }

        if (name.length > 20) {
            errorMessage.textContent = 'Name must be 20 characters or less!';
            nameInput.focus();
            return;
        }

        // Check for invalid characters (only allow letters, numbers, spaces, and basic punctuation)
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) {
            errorMessage.textContent = 'Name contains invalid characters!';
            nameInput.focus();
            return;
        }

        // Clear error message
        errorMessage.textContent = '';

        // Send name to main process
        ipcRenderer.send('pet:nameSubmitted', name);

        // Close the window
        window.close();
    }

    // Focus input on load
    nameInput.focus();
});

