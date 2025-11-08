const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let petWindow;
let shopWindow;
let statsWindow;
let isPetSleeping = false; // Track pet sleep state for menu updates
let isPetExercising = false; // Track pet exercise state for menu updates
let isPetSick = false; // Track pet sickness state (starts healthy)
let isPetDead = false; // Track pet death state
let wasteCount = 0; // Track waste count for sickness chance calculation
let isEggHatched = false; // Track if egg has hatched (stats don't decay until hatched)

// Store stats even when stats window is closed
let storedStats = {
  health: { value: 50, max: 100 },
  rest: { value: 50, max: 100 },
  hunger: { value: 50, max: 100 },
  happiness: { value: 50, max: 100 },
  experience: { value: 0, max: 100 } // Hidden stat - not shown in stats window
};

// Evolution system
let currentEvolutionStage = 1; // Start at stage 1

// Money system
let money = 100; // Starting money
const MONEY_INCREMENT_INTERVAL = 60000; // 1 minute in milliseconds
const MONEY_INCREMENT_AMOUNT = 50; // Amount money increases by
let moneyIncrementIntervalId = null;

// Item costs
const ITEM_COSTS = {
  food1: 15,
  medicine1: 35,
  medkit1: 50,
  egg1: 30
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

// Health increment system - runs in main process so it persists even when windows are closed
// Only increments when pet IS sleeping
const HEALTH_INCREMENT_INTERVAL = 240000; // 4 minutes in milliseconds
const HEALTH_INCREMENT_AMOUNT = 5; // Amount health increases by while sleeping
let healthIncrementIntervalId = null;

// Health decay system - runs in main process so it persists even when windows are closed
// Only decays when pet IS sick
const HEALTH_DECAY_INTERVAL = 90000; // 1.5 minutes in milliseconds
const HEALTH_DECAY_AMOUNT = 10; // Amount health decreases by when sick
const HEALTH_MAX = 100;
const HEALTH_MIN = 0;
let healthDecayIntervalId = null;

// Sickness check system - runs in main process so it persists even when windows are closed
const SICKNESS_CHECK_INTERVAL = 300000; // 5 minutes in milliseconds
const BASE_SICKNESS_CHANCE = 0.05; // 5% base chance
const WASTE_SICKNESS_CHANCE_PER_ITEM = 0.10; // 10% per waste item
let sicknessCheckIntervalId = null;

// Health decay from low stats system - runs in main process so it persists even when windows are closed
const LOW_STATS_HEALTH_DECAY_INTERVAL = 60000; // 1 minute in milliseconds
const LOW_STATS_HEALTH_DECAY_SINGLE = 5; // Health decrease when 1 stat is at 0
const LOW_STATS_HEALTH_DECAY_DOUBLE = 10; // Health decrease when 2 stats are at 0
const LOW_STATS_HEALTH_DECAY_TRIPLE = 15; // Health decrease when all 3 stats are at 0
let lowStatsHealthDecayIntervalId = null;

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
    // Send evolution stage to pet window
    petWindow.webContents.send('pet:evolutionStage', currentEvolutionStage);
    // Send egg hatched state to pet window
    petWindow.webContents.send('egg:hatchedState', isEggHatched);
  });

  // Build custom menu with Actions, Shop, and Stats
  buildMenu();
  
  // Start decay systems in main process (only if egg is hatched)
  // Note: Decay systems will check isEggHatched internally
  startHungerDecay();
  startHappinessDecay();
  startRestDecay();
  startHealthDecay(); // Start health decay (will only run if pet is sick)
  startSicknessCheck(); // Start sickness check system
  startMoneyIncrement(); // Start money increment system
  startLowStatsHealthDecay(); // Start health decay from low stats
  // Rest increment is started/stopped when pet sleeps/wakes
  
  // Send initial money to pet window
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.once('did-finish-load', () => {
      petWindow.webContents.send('money:update', money);
    });
  }
}

// Build menu with dynamic Sleep/Wake Up and Exercise/Stop Exercise buttons
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
          },
          enabled: !isPetExercising // Disable sleep when exercising
        },
        {
          label: isPetExercising ? 'Stop Exercising' : 'Exercise',
          click: () => {
            if (isPetExercising) {
              // Stop exercising
              if (petWindow && !petWindow.isDestroyed()) {
                petWindow.webContents.send('action:stopExercise');
              }
            } else {
              // Start exercising
              if (petWindow && !petWindow.isDestroyed()) {
                petWindow.webContents.send('action:exercise');
              }
            }
          },
          enabled: !isPetSleeping && !isPetDead // Disable exercise when sleeping or dead
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
  
  // Send initial money to shop window when it's ready
  shopWindow.webContents.once('did-finish-load', () => {
    shopWindow.webContents.send('money:update', money);
  });
  
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

// Handle shop purchases - check money and deduct cost
ipcMain.on('shop:buy', (_event, payload) => {
  if (!payload || !payload.id) return;
  
  const itemId = payload.id;
  const cost = ITEM_COSTS[itemId];
  
  // Check if cost exists and player has enough money
  if (cost === undefined) {
    console.error('Unknown item:', itemId);
    return;
  }
  
  if (money < cost) {
    // Not enough money - notify shop window
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('shop:purchaseFailed', { reason: 'insufficient_funds', cost: cost, current: money });
    }
    return;
  }
  
  // Deduct money
  money -= cost;
  
  // Send money update to all windows
  sendMoneyUpdate();
  
  // Forward purchase to pet window to spawn item
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('shop:spawnItem', payload);
  }

  console.log(`Purchased ${itemId} for $${cost}. Remaining money: $${money}`);
});

// Handle egg hatching
ipcMain.on('egg:hatched', () => {
  isEggHatched = true;
  console.log('Egg has hatched! Stats decay will now start.');
});

// Send money update to all windows
function sendMoneyUpdate() {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('money:update', money);
  }
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.webContents.send('money:update', money);
  }
}

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
  
  // Forward to stats window if it's open (but NOT experience, which is hidden)
  if (statsWindow && !statsWindow.isDestroyed() && key !== 'experience') {
    statsWindow.webContents.send('stats:update', payload);
  }
});

// Handle pet sleep state changes to update menu
ipcMain.on('pet:sleeping', (_event, sleeping) => {
  isPetSleeping = sleeping;
  buildMenu(); // Rebuild menu with updated Sleep/Wake Up button
  
  if (sleeping) {
    // Pet is sleeping - stop decay and start increments
    stopRestDecay();
    startRestIncrement();
    startHealthIncrement();
    // Stop exercise if sleeping
    if (isPetExercising) {
      isPetExercising = false;
      stopExerciseInterval();
      buildMenu();
    }
  } else {
    // Pet is awake - stop increments and start decay
    stopRestIncrement();
    stopHealthIncrement();
    startRestDecay();
  }
});

// Handle pet exercise state changes to update menu
ipcMain.on('pet:exercising', (_event, exercising) => {
  isPetExercising = exercising;
  buildMenu(); // Rebuild menu with updated Exercise/Stop Exercise button
  
  if (exercising) {
    // Pet is exercising - start exercise interval
    startExerciseInterval();
  } else {
    // Pet stopped exercising - stop exercise interval
    stopExerciseInterval();
  }
});

// Handle pet sickness state changes
ipcMain.on('pet:sick', (_event, sick) => {
  isPetSick = sick;
  
  if (sick) {
    // Pet is sick - start health decay
    startHealthDecay();
    // Notify renderer to update appearance
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('pet:becameSick');
    }
  } else {
    // Pet is cured - stop health decay
    stopHealthDecay();
    // Notify renderer to update appearance
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('pet:becameHealthy');
    }
  }
});

// Handle pet death state changes
ipcMain.on('pet:death', (_event, dead) => {
  isPetDead = dead;
  
  // Stop exercise if pet dies
  if (dead && isPetExercising) {
    isPetExercising = false;
    stopExerciseInterval();
    buildMenu();
  }
});

// Handle pet evolution
ipcMain.on('pet:evolved', (_event, stage) => {
  currentEvolutionStage = stage;
  console.log(`Pet evolved to stage ${stage}!`);
});

// Handle evolution stage request from renderer
ipcMain.on('pet:requestEvolutionStage', (event) => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:evolutionStage', currentEvolutionStage);
  }
});

// Handle waste count updates from renderer
ipcMain.on('waste:updateCount', (_event, count) => {
  wasteCount = count;
});

// Handle money request from any window
ipcMain.on('money:request', (event) => {
  event.reply('money:response', money);
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
  // But only if egg is hatched
  hungerDecayIntervalId = setInterval(() => {
    // Don't decay stats if egg hasn't hatched
    if (!isEggHatched) {
      return;
    }
    
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
    // Don't decay stats if egg hasn't hatched
    if (!isEggHatched) {
      return;
    }
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
    // Don't decay stats if egg hasn't hatched
    if (!isEggHatched) {
      return;
    }
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

// Start health increment system - runs continuously in main process
// Only increments when pet IS sleeping
function startHealthIncrement() {
  // Clear any existing interval
  if (healthIncrementIntervalId) {
    clearInterval(healthIncrementIntervalId);
  }
  
  // Don't start increment if pet is not sleeping
  if (!isPetSleeping) {
    return;
  }
  
  // Set up interval to increase health every 4 minutes (only when sleeping)
  healthIncrementIntervalId = setInterval(() => {
    // Don't increment if pet is not sleeping
    if (!isPetSleeping) {
      stopHealthIncrement();
      return;
    }
    
    if (!storedStats.health) {
      storedStats.health = { value: 50, max: HEALTH_MAX };
    }
    
    // Increase health by the increment amount (cap at max)
    const currentHealth = storedStats.health.value;
    const newHealth = Math.min(HEALTH_MAX, currentHealth + HEALTH_INCREMENT_AMOUNT);
    
    // Update stored stat
    storedStats.health.value = newHealth;
    
    // Check if pet was revived (health > 0 after being dead)
    if (newHealth > 0 && isPetDead) {
      isPetDead = false;
      // Notify renderer that pet was revived
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet:revived');
      }
      console.log('Pet has been revived!');
    }
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'health',
        value: newHealth,
        max: HEALTH_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'health',
        value: newHealth,
        max: HEALTH_MAX
      });
    }
  }, HEALTH_INCREMENT_INTERVAL);
}

// Stop health increment system
function stopHealthIncrement() {
  if (healthIncrementIntervalId) {
    clearInterval(healthIncrementIntervalId);
    healthIncrementIntervalId = null;
  }
}

// Start health decay system - runs continuously in main process
// Only decays when pet IS sick
function startHealthDecay() {
  // Clear any existing interval
  if (healthDecayIntervalId) {
    clearInterval(healthDecayIntervalId);
  }
  
  // Don't start if pet is not sick
  if (!isPetSick) {
    return;
  }
  
  // Set up interval to decrease health every 1.5 minutes (only when sick)
  healthDecayIntervalId = setInterval(() => {
    // Don't decay if pet is not sick
    if (!isPetSick) {
      stopHealthDecay();
      return;
    }
    
    if (!storedStats.health) {
      storedStats.health = { value: 50, max: HEALTH_MAX };
    }
    
    // Decrease health by the decay amount
    const currentHealth = storedStats.health.value;
    const newHealth = Math.max(HEALTH_MIN, currentHealth - HEALTH_DECAY_AMOUNT);
    
    // Update stored stat
    storedStats.health.value = newHealth;
    
    // Check if pet died (health reached 0)
    if (newHealth === 0 && currentHealth > 0 && !isPetDead) {
      isPetDead = true;
      // Notify renderer that pet died
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet:died');
      }
      console.log('Pet has died!');
    }
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'health',
        value: newHealth,
        max: HEALTH_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'health',
        value: newHealth,
        max: HEALTH_MAX
      });
    }
  }, HEALTH_DECAY_INTERVAL);
}

// Stop health decay system
function stopHealthDecay() {
  if (healthDecayIntervalId) {
    clearInterval(healthDecayIntervalId);
    healthDecayIntervalId = null;
  }
}

// Start sickness check system - runs continuously in main process
function startSicknessCheck() {
  // Clear any existing interval
  if (sicknessCheckIntervalId) {
    clearInterval(sicknessCheckIntervalId);
  }
  
  // Set up interval to check for sickness every 5 minutes
  sicknessCheckIntervalId = setInterval(() => {
    // Don't check sickness if egg hasn't hatched
    if (!isEggHatched) {
      return;
    }
    // Don't check if pet is already sick
    if (isPetSick) {
      return;
    }
    
    // Calculate sickness chance: 5% base + 10% per waste item
    const sicknessChance = BASE_SICKNESS_CHANCE + (wasteCount * WASTE_SICKNESS_CHANCE_PER_ITEM);
    const randomValue = Math.random();
    
    // If random value is less than sickness chance, pet becomes sick
    if (randomValue < sicknessChance) {
      isPetSick = true;
      startHealthDecay();
      
      // Notify renderer that pet became sick
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet:becameSick');
      }
      
      console.log(`Pet became sick! Chance was ${(sicknessChance * 100).toFixed(1)}% (${wasteCount} waste items)`);
    }
  }, SICKNESS_CHECK_INTERVAL);
}

// Stop sickness check system
function stopSicknessCheck() {
  if (sicknessCheckIntervalId) {
    clearInterval(sicknessCheckIntervalId);
    sicknessCheckIntervalId = null;
  }
}

// Start money increment system - runs continuously in main process
function startMoneyIncrement() {
  // Clear any existing interval
  if (moneyIncrementIntervalId) {
    clearInterval(moneyIncrementIntervalId);
  }
  
  // Set up interval to increase money every minute
  moneyIncrementIntervalId = setInterval(() => {
    money += MONEY_INCREMENT_AMOUNT;
    sendMoneyUpdate();
    console.log(`Money increased by $${MONEY_INCREMENT_AMOUNT}. Total: $${money}`);
  }, MONEY_INCREMENT_INTERVAL);
}

// Stop money increment system
function stopMoneyIncrement() {
  if (moneyIncrementIntervalId) {
    clearInterval(moneyIncrementIntervalId);
    moneyIncrementIntervalId = null;
  }
}

// Start health decay from low stats system - runs continuously in main process
function startLowStatsHealthDecay() {
  // Clear any existing interval
  if (lowStatsHealthDecayIntervalId) {
    clearInterval(lowStatsHealthDecayIntervalId);
  }
  
  // Set up interval to check and decrease health every minute based on low stats
  lowStatsHealthDecayIntervalId = setInterval(() => {
    // Don't decay stats if egg hasn't hatched
    if (!isEggHatched) {
      return;
    }
    
    // Get current stat values
    const currentHunger = storedStats.hunger ? storedStats.hunger.value : 50;
    const currentRest = storedStats.rest ? storedStats.rest.value : 50;
    const currentHappiness = storedStats.happiness ? storedStats.happiness.value : 50;
    
    // Count how many stats are at 0
    let statsAtZero = 0;
    if (currentHunger === 0) statsAtZero++;
    if (currentRest === 0) statsAtZero++;
    if (currentHappiness === 0) statsAtZero++;
    
    // Only decrease health if at least one stat is at 0
    if (statsAtZero === 0) {
      return; // No stats at 0, no health decrease
    }
    
    // Calculate health decrease based on how many stats are at 0
    let healthDecrease = 0;
    if (statsAtZero === 1) {
      healthDecrease = LOW_STATS_HEALTH_DECAY_SINGLE;
    } else if (statsAtZero === 2) {
      healthDecrease = LOW_STATS_HEALTH_DECAY_DOUBLE;
    } else if (statsAtZero === 3) {
      healthDecrease = LOW_STATS_HEALTH_DECAY_TRIPLE;
    }
    
    // Decrease health
    if (!storedStats.health) {
      storedStats.health = { value: 50, max: HEALTH_MAX };
    }
    
    const currentHealth = storedStats.health.value;
    const newHealth = Math.max(HEALTH_MIN, currentHealth - healthDecrease);
    
    // Update stored stat
    storedStats.health.value = newHealth;
    
    // Check if pet died (health reached 0)
    if (newHealth === 0 && currentHealth > 0 && !isPetDead) {
      isPetDead = true;
      // Notify renderer that pet died
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet:died');
      }
      console.log('Pet has died!');
    }
    // Check if pet was revived (health > 0 after being dead)
    else if (newHealth > 0 && isPetDead) {
      isPetDead = false;
      // Notify renderer that pet was revived
      if (petWindow && !petWindow.isDestroyed()) {
        petWindow.webContents.send('pet:revived');
      }
      console.log('Pet has been revived!');
    }
    
    // Send update to pet window if it's open
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'health',
        value: newHealth,
        max: HEALTH_MAX
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'health',
        value: newHealth,
        max: HEALTH_MAX
      });
    }
    
    if (healthDecrease > 0) {
      console.log(`Health decreased by ${healthDecrease} due to ${statsAtZero} stat(s) at 0. New health: ${newHealth}`);
    }
  }, LOW_STATS_HEALTH_DECAY_INTERVAL);
}

// Stop health decay from low stats system
function stopLowStatsHealthDecay() {
  if (lowStatsHealthDecayIntervalId) {
    clearInterval(lowStatsHealthDecayIntervalId);
    lowStatsHealthDecayIntervalId = null;
  }
}

// Exercise interval system - runs in main process so it persists even when windows are closed
// Only runs when pet IS exercising
const EXERCISE_INTERVAL = 60000; // 1 minute in milliseconds
const EXERCISE_EXP_GAIN = 30; // Experience gained per minute of exercise
const EXERCISE_HUNGER_DECREASE = 15; // Hunger decreased per minute of exercise
const EXERCISE_REST_DECREASE = 15; // Rest decreased per minute of exercise
let exerciseIntervalId = null;

// Start exercise interval system - runs continuously in main process
// Only runs when pet IS exercising
function startExerciseInterval() {
  // Clear any existing interval
  if (exerciseIntervalId) {
    clearInterval(exerciseIntervalId);
  }
  
  // Don't start if pet is not exercising
  if (!isPetExercising) {
    return;
  }
  
  // Set up interval to update stats every minute (only when exercising)
  exerciseIntervalId = setInterval(() => {
    // Don't update if pet is not exercising
    if (!isPetExercising) {
      stopExerciseInterval();
      return;
    }
    
    // Gain experience (30 per minute)
    if (!storedStats.experience) {
      storedStats.experience = { value: 0, max: 100 };
    }
    const currentExp = storedStats.experience.value;
    const newExp = Math.min(100, currentExp + EXERCISE_EXP_GAIN);
    storedStats.experience.value = newExp;
    
    // Send experience update to pet window (but not to stats window, as it's hidden)
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'experience',
        value: newExp,
        max: 100
      });
    }
    
    // Decrease hunger (15 per minute)
    if (!storedStats.hunger) {
      storedStats.hunger = { value: 50, max: HUNGER_MAX };
    }
    const currentHunger = storedStats.hunger.value;
    const newHunger = Math.max(HUNGER_MIN, currentHunger - EXERCISE_HUNGER_DECREASE);
    storedStats.hunger.value = newHunger;
    
    // Send update to pet window
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
    
    // Decrease rest (15 per minute)
    if (!storedStats.rest) {
      storedStats.rest = { value: 50, max: REST_MAX };
    }
    const currentRest = storedStats.rest.value;
    const newRest = Math.max(REST_MIN, currentRest - EXERCISE_REST_DECREASE);
    storedStats.rest.value = newRest;
    
    // Send update to pet window
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
    
    console.log(`Exercise update: +${EXERCISE_EXP_GAIN} exp, -${EXERCISE_HUNGER_DECREASE} hunger, -${EXERCISE_REST_DECREASE} rest`);
  }, EXERCISE_INTERVAL);
}

// Stop exercise interval system
function stopExerciseInterval() {
  if (exerciseIntervalId) {
    clearInterval(exerciseIntervalId);
    exerciseIntervalId = null;
  }
}

