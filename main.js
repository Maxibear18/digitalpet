const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let petWindow;
let shopWindow;
let statsWindow;

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
      contextIsolation: false,
      backgroundThrottling: false // Prevent throttling when window is minimized
    }
  });

  // Load the HTML file
  petWindow.loadFile('index.html');

  // Set initial position (center of screen)
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  petWindow.setPosition(Math.floor((width - 320) / 2), Math.floor((height - 320) / 2));

  // Build custom menu with Actions, Shop, and Stats
  const template = [
    {
      label: 'Actions',
      submenu: [
        {
          label: 'Sleep',
          click: () => {
            // Placeholder for sleep action - doesn't do much right now
            console.log('Sleep action triggered');
            // TODO: Implement sleep functionality
          }
        }
      ]
    },
    {
      label: 'Shop',
      click: () => {
        openShopWindow();
      }
    },
    {
      label: 'Stats',
      click: () => {
        openStatsWindow();
      }
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
      contextIsolation: false,
      backgroundThrottling: false // Prevent throttling when window is minimized
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

function openStatsWindow() {
  if (statsWindow && !statsWindow.isDestroyed()) {
    statsWindow.focus();
    return;
  }
  statsWindow = new BrowserWindow({
    width: 260,
    height: 360,
    resizable: true,
    title: 'Stats',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false // Prevent throttling when window is minimized
    }
  });
  if (statsWindow && !statsWindow.isDestroyed()) {
    statsWindow.setMenu(null);
    statsWindow.setMenuBarVisibility(false);
  }
  statsWindow.loadFile('stats.html');
  statsWindow.on('closed', () => {
    statsWindow = null;
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

// Forward stat updates from pet to stats window
ipcMain.on('stats:update', (_event, payload) => {
  if (statsWindow && !statsWindow.isDestroyed()) {
    statsWindow.webContents.send('stats:update', payload);
  }
});

