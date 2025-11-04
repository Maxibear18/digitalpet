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

// Happiness decay system - runs in main process so it persists even when windows are closed
const HAPPINESS_DECAY_INTERVAL = 60000; // 1 minute in milliseconds
const HAPPINESS_DECAY_AMOUNT = 10; // Amount happiness decreases by
const HAPPINESS_MAX = 100;
const HAPPINESS_MIN = 0;
let happinessDecayIntervalId = null;

// Rest decay system - runs in main process so it persists even when windows are closed
// Only decays when pet is NOT sleeping
const REST_DECAY_INTERVAL = 90000; // 1.5 minutes in milliseconds
const REST_DECAY_AMOUNT = 5; // Amount rest decreases by
const REST_MAX = 100;
const REST_MIN = 0;
let restDecayIntervalId = null;

// Rest increment system - runs in main process so it persists even when windows are closed
// Only increments when pet IS sleeping
const REST_INCREMENT_INTERVAL = 45000; // 45 seconds in milliseconds
const REST_INCREMENT_AMOUNT = 5; // Amount rest increases by while sleeping
let restIncrementIntervalId = null;

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
  
  // Start decay systems in main process
  startHungerDecay();
  startHappinessDecay();
  startRestDecay();
  // Rest increment is started/stopped when pet sleeps/wakes
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
  
  if (sleeping) {
    // Pet is sleeping - stop decay and start increment
    stopRestDecay();
    startRestIncrement();
  } else {
    // Pet is awake - stop increment and start decay
    stopRestIncrement();
    startRestDecay();
  }
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
// Hunger decays regardless of sleep state (continues even when pet is sleeping)
function startHungerDecay() {
  // Clear any existing interval
  if (hungerDecayIntervalId) {
    clearInterval(hungerDecayIntervalId);
  }
  
  // Set up interval to decrease hunger every 2.5 minutes
  // Note: This runs regardless of sleep state - hunger always decreases
  hungerDecayIntervalId = setInterval(() => {
    if (!storedStats.hunger) {
      storedStats.hunger = { value: 50, max: HUNGER_MAX };
    }
    
    // Decrease hunger by the decay amount (works even when sleeping)
    const currentHunger = storedStats.hunger.value;
    const newHunger = Math.max(HUNGER_MIN, currentHunger - HUNGER_DECAY_AMOUNT);
    
    // Update stored stat
    storedStats.hunger.value = newHunger;
    
    // Send update to pet window if it's open (even when sleeping)
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

// Start happiness decay system - runs continuously in main process
// Only decays when pet is NOT sleeping
function startHappinessDecay() {
  // Clear any existing interval
  if (happinessDecayIntervalId) {
    clearInterval(happinessDecayIntervalId);
  }
  
  // Set up interval to decrease happiness every minute (only when awake)
  happinessDecayIntervalId = setInterval(() => {
    // Don't decay happiness if pet is sleeping
    if (isPetSleeping) {
      return;
    }
    
    if (!storedStats.happiness) {
      storedStats.happiness = { value: 50, max: HAPPINESS_MAX };
    }
    
    // Decrease happiness by the decay amount
    const currentHappiness = storedStats.happiness.value;
    const newHappiness = Math.max(HAPPINESS_MIN, currentHappiness - HAPPINESS_DECAY_AMOUNT);
    
    // Update stored stat
    storedStats.happiness.value = newHappiness;
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'happiness',
        value: newHappiness,
        max: HAPPINESS_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'happiness',
        value: newHappiness,
        max: HAPPINESS_MAX
      });
    }
  }, HAPPINESS_DECAY_INTERVAL);
}

// Start rest decay system - runs continuously in main process
// Only decays when pet is NOT sleeping
function startRestDecay() {
  // Clear any existing interval
  if (restDecayIntervalId) {
    clearInterval(restDecayIntervalId);
  }
  
  // Don't start decay if pet is sleeping
  if (isPetSleeping) {
    return;
  }
  
  // Set up interval to decrease rest every 1.5 minutes (only when awake)
  restDecayIntervalId = setInterval(() => {
    // Don't decay if pet is sleeping
    if (isPetSleeping) {
      return;
    }
    
    if (!storedStats.rest) {
      storedStats.rest = { value: 50, max: REST_MAX };
    }
    
    // Decrease rest by the decay amount
    const currentRest = storedStats.rest.value;
    const newRest = Math.max(REST_MIN, currentRest - REST_DECAY_AMOUNT);
    
    // Update stored stat
    storedStats.rest.value = newRest;
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'rest',
        value: newRest,
        max: REST_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'rest',
        value: newRest,
        max: REST_MAX
      });
    }
  }, REST_DECAY_INTERVAL);
}

// Stop rest decay system
function stopRestDecay() {
  if (restDecayIntervalId) {
    clearInterval(restDecayIntervalId);
    restDecayIntervalId = null;
  }
}

// Start rest increment system - runs continuously in main process
// Only increments when pet IS sleeping
function startRestIncrement() {
  // Clear any existing interval
  if (restIncrementIntervalId) {
    clearInterval(restIncrementIntervalId);
  }
  
  // Don't start increment if pet is not sleeping
  if (!isPetSleeping) {
    return;
  }
  
  // Set up interval to increase rest every 45 seconds (only when sleeping)
  restIncrementIntervalId = setInterval(() => {
    // Don't increment if pet is not sleeping
    if (!isPetSleeping) {
      stopRestIncrement();
      return;
    }
    
    if (!storedStats.rest) {
      storedStats.rest = { value: 50, max: REST_MAX };
    }
    
    // Increase rest by the increment amount (cap at max)
    const currentRest = storedStats.rest.value;
    const newRest = Math.min(REST_MAX, currentRest + REST_INCREMENT_AMOUNT);
    
    // Update stored stat
    storedStats.rest.value = newRest;
    
    // Auto-wake when rest reaches 100
    if (newRest >= REST_MAX && isPetSleeping) {
      // Notify renderer to wake up
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('action:wake');
      }
    }
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'rest',
        value: newRest,
        max: REST_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'rest',
        value: newRest,
        max: REST_MAX
      });
    }
  }, REST_INCREMENT_INTERVAL);
}

// Stop rest increment system
function stopRestIncrement() {
  if (restIncrementIntervalId) {
    clearInterval(restIncrementIntervalId);
    restIncrementIntervalId = null;
  }
}

