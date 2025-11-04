const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let petWindow;
let shopWindow;
let statsWindow;
let isPetSleeping = false; // Track pet sleep state for menu updates

// Store stats even when stats window is closed
let storedStats = {
  health: { value: 50, max: 100 },
  rest: { value: 50, max: 100 },
  hunger: { value: 50, max: 100 },
  happiness: { value: 50, max: 100 }
};

// Hunger decay system - runs in main process so it persists even when windows are closed
const HUNGER_DECAY_INTERVAL = 150000; // 2.5 minutes in milliseconds
const HUNGER_DECAY_AMOUNT = 10; // Amount hunger decreases by
const HUNGER_MAX = 100;
const HUNGER_MIN = 0;
let hungerDecayIntervalId = null;

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

  // Send stored stats to pet window once it's ready
  petWindow.webContents.once('did-finish-load', () => {
    // Send all stored stats to the pet window
    Object.keys(storedStats).forEach(key => {
      const stat = storedStats[key];
      petWindow.webContents.send('stats:load', {
        key: key,
        value: stat.value,
        max: stat.max
      });
    });
  });

  // Build custom menu with Actions, Shop, and Stats
  buildMenu();
  
  // Start hunger decay system in main process
  startHungerDecay();
}

// Build menu with dynamic Sleep/Wake Up button
function buildMenu() {
  const template = [
    {
      label: 'Actions',
      submenu: [
        {
          label: isPetSleeping ? 'Wake Up' : 'Sleep',
          click: () => {
            if (isPetSleeping) {
              // Wake up pet
              if (petWindow && !petWindow.isDestroyed()) {
                petWindow.webContents.send('action:wake');
              }
            } else {
              // Put pet to sleep
              if (petWindow && !petWindow.isDestroyed()) {
                petWindow.webContents.send('action:sleep');
              }
            }
          }
        }
      ]
    },
    {
      label: 'Shop',
      click: () => {
        openShopWindow();
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
  
  // Send all stored stats to the window once it's ready
  statsWindow.webContents.once('did-finish-load', () => {
    // Send all stored stats to update the window
    Object.keys(storedStats).forEach(key => {
      const stat = storedStats[key];
      statsWindow.webContents.send('stats:update', {
        key: key,
        value: stat.value,
        max: stat.max
      });
    });
  });
  
  statsWindow.on('closed', () => {
    statsWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createPetWindow();
  // Hunger decay is started in createPetWindow(), but ensure it runs even if window creation has issues
});

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
// Also store stats so they persist even when window is closed
ipcMain.on('stats:update', (_event, payload) => {
  if (!payload || !payload.key) return;
  
  // Store the stat update
  const key = payload.key;
  const value = typeof payload.value === 'number' ? payload.value : 0;
  const max = typeof payload.max === 'number' ? payload.max : 100;
  
  if (storedStats[key]) {
    storedStats[key].value = value;
    storedStats[key].max = max;
  } else {
    storedStats[key] = { value: value, max: max };
  }
  
  // Forward to stats window if it's open
  if (statsWindow && !statsWindow.isDestroyed()) {
    statsWindow.webContents.send('stats:update', payload);
  }
});

// Handle pet sleep state changes to update menu
ipcMain.on('pet:sleeping', (_event, sleeping) => {
  isPetSleeping = sleeping;
  buildMenu(); // Rebuild menu with updated Sleep/Wake Up button
});

// Handle request for stored stats (so pet window can load them on startup)
ipcMain.on('stats:request', (event) => {
  // Send all stored stats to the requesting window
  Object.keys(storedStats).forEach(key => {
    const stat = storedStats[key];
    event.reply('stats:load', {
      key: key,
      value: stat.value,
      max: stat.max
    });
  });
});

// Start hunger decay system - runs continuously in main process
function startHungerDecay() {
  // Clear any existing interval
  if (hungerDecayIntervalId) {
    clearInterval(hungerDecayIntervalId);
  }
  
  // Set up interval to decrease hunger every 2.5 minutes
  hungerDecayIntervalId = setInterval(() => {
    if (!storedStats.hunger) {
      storedStats.hunger = { value: 50, max: HUNGER_MAX };
    }
    
    // Decrease hunger by the decay amount
    const currentHunger = storedStats.hunger.value;
    const newHunger = Math.max(HUNGER_MIN, currentHunger - HUNGER_DECAY_AMOUNT);
    
    // Update stored stat
    storedStats.hunger.value = newHunger;
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'hunger',
        value: newHunger,
        max: HUNGER_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'hunger',
        value: newHunger,
        max: HUNGER_MAX
      });
    }
  }, HUNGER_DECAY_INTERVAL);
}

