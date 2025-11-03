const { app, BrowserWindow } = require('electron');
const path = require('path');

let petWindow;

function createPetWindow() {
  // Create the browser window
  petWindow = new BrowserWindow({
    width: 320,
    height: 320,
    frame: true, // Show window frame
    transparent: false, // Make window opaque
    alwaysOnTop: false, // Don't force on top
    skipTaskbar: false, // Show in taskbar
    resizable: true, // Allow resizing
    minWidth: 200,
    minHeight: 200,
    title: 'Digital Pet',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the HTML file
  petWindow.loadFile('index.html');

  // Set initial position (center of screen)
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  petWindow.setPosition(Math.floor((width - 320) / 2), Math.floor((height - 320) / 2));
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createPetWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createPetWindow();
  }
});

