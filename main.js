const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let petWindow;
let shopWindow;

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

  // Build custom menu with Shop and Stats
  const template = [
    {
      label: 'Shop',
      click: () => {
        openShopWindow();
      }
    },
    {
      label: 'Stats',
      submenu: [
        {
          label: 'Open Stats',
          click: () => {
            if (petWindow) {
              petWindow.webContents.send('menu:open', 'stats');
            }
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openShopWindow() {
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.focus();
    return;
  }
  shopWindow = new BrowserWindow({
    width: 560,
    height: 420,
    resizable: true,
    title: 'Shop',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  // Remove app menu from the Shop window entirely
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.setMenu(null);
    shopWindow.setMenuBarVisibility(false);
  }
  shopWindow.loadFile('shop.html');
  shopWindow.on('closed', () => {
    shopWindow = null;
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

// Forward shop purchases to the pet window
ipcMain.on('shop:buy', (_event, payload) => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('shop:spawnItem', payload);
  }
});

