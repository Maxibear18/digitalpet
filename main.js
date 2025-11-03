const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let petWindow;

function createPetWindow() {
  // Create the browser window
  petWindow = new BrowserWindow({
    width: 200,
    height: 200,
    frame: false, // Remove window frame
    transparent: true, // Make window transparent
    alwaysOnTop: true, // Keep window on top
    skipTaskbar: true, // Don't show in taskbar
    resizable: false, // Prevent resizing
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the HTML file
  petWindow.loadFile('index.html');

  // Set initial position (bottom-right corner of screen)
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  petWindow.setPosition(width - 220, height - 220);

  // Handle window movement from renderer
  ipcMain.handle('move-window', (event, { x, y }) => {
    petWindow.setPosition(x, y);
  });
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

