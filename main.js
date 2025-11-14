const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let petWindow;
let shopWindow;
let statsWindow;
let gamesWindow;
let nameDialogWindow = null; // Name dialog window
let petName = 'Digital Pet'; // Default pet name
let isPetSleeping = false; // Track pet sleep state for menu updates
let isPetExercising = false; // Track pet exercise state for menu updates
let isPetSick = false; // Track pet sickness state (starts healthy)
let isPetDead = false; // Track pet death state
let wasteCount = 0; // Track waste count for sickness chance calculation
let isEggHatched = false; // Track if egg has hatched (stats don't decay until hatched)
let hasEgg = false; // Track if player has purchased an egg (prevents buying more eggs)

// Purchased games tracking
let purchasedGames = {
  slotMachine: false, // Track if slot machine has been purchased
  solver: false, // Track if solver has been purchased
  shooter: false, // Track if shooter has been purchased
  snake: false // Track if snake has been purchased
};

// Store stats even when stats window is closed
let storedStats = {
  health: { value: 50, max: 100 },
  rest: { value: 50, max: 100 },
  hunger: { value: 50, max: 100 },
  happiness: { value: 50, max: 100 },
  experience: { value: 0, max: 300 } // Hidden stat - not shown in stats window
};

// Evolution system
let currentEvolutionStage = 1; // Start at stage 1
let currentPetType = 'botamon'; // Current pet type (botamon, poyomon, punimon, pitchmon)

// Money system
let money = 1500; // Starting money
const MONEY_INCREMENT_INTERVAL = 60000; // 1 minute in milliseconds
const MONEY_INCREMENT_AMOUNT = 50; // Amount money increases by
let moneyIncrementIntervalId = null;

// Item costs
const ITEM_COSTS = {
  cherry: 15,
  riceball: 25,
  sandwich: 35,
  meat: 45,
  cake: 60,
  icecream: 40,
  coffee: 60,
  medicine1: 35,
  medkit1: 50,
  egg1: 30,
  eggInter: 50,
  slotMachine: 500,
  solver: 300,
  shooter: 350,
  snake: 325,
  bubblewand: 200,
  calculator: 325,
  chimes: 250,
  musicplayer: 300,
  paddle: 350,
  pudding: 225
};

// Hunger decay system - runs in main process so it persists even when windows are closed
const HUNGER_DECAY_INTERVAL = 120000; // 2 minutes in milliseconds
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
    title: petName,
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
    // Send pet type to pet window
    petWindow.webContents.send('pet:typeUpdate', currentPetType);
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
      enabled: isEggHatched, // Disable until pet is hatched
      submenu: [
        {
          label: isPetSleeping ? 'Wake Up' : 'Sleep',
          click: () => {
            if (!isEggHatched) return; // Prevent action if pet not hatched
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
          enabled: isEggHatched && !isPetExercising // Disable sleep when exercising or pet not hatched
        },
        {
          label: isPetExercising ? 'Stop Exercising' : 'Exercise',
          click: () => {
            if (!isEggHatched) return; // Prevent action if pet not hatched
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
          enabled: isEggHatched && !isPetSleeping && !isPetDead // Disable exercise when sleeping, dead, or pet not hatched
        }
      ]
    },
    {
      label: 'Games',
      enabled: isEggHatched, // Disable until pet is hatched
      submenu: (() => {
        const gamesSubmenu = [
          {
            label: 'Simon Says',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openSimonSaysWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          },
          {
            label: 'Memory Match',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openMemoryMatchWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          },
          {
            label: 'Reaction Time',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openReactionTimeWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          }
        ];
        
        // Add Slot Machine if purchased
        if (purchasedGames.slotMachine) {
          gamesSubmenu.push({
            label: 'Slot Machine',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openSlotMachineWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          });
        }
        
        // Add Solver if purchased
        if (purchasedGames.solver) {
          gamesSubmenu.push({
            label: 'Solver',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openSolverWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          });
        }
        
        // Add Shooter if purchased
        if (purchasedGames.shooter) {
          gamesSubmenu.push({
            label: 'Shooter',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openShooterWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          });
        }
        
        // Add Snake if purchased
        if (purchasedGames.snake) {
          gamesSubmenu.push({
            label: 'Snake',
            click: () => {
              if (!isEggHatched) return; // Prevent action if pet not hatched
              openSnakeWindow();
            },
            enabled: isEggHatched // Disable until pet is hatched
          });
        }
        
        return gamesSubmenu;
      })()
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
    // Send pet state to shop window (to disable egg button if pet exists or egg purchased)
    shopWindow.webContents.send('pet:stateUpdate', { isEggHatched: isEggHatched, hasEgg: hasEgg, petType: currentPetType, evolutionStage: currentEvolutionStage });
    shopWindow.webContents.send('shop:petType', currentPetType, currentEvolutionStage);
    // Send purchased games state
    shopWindow.webContents.send('games:purchased', purchasedGames);
  });
  
  shopWindow.on('closed', () => {
    shopWindow = null;
  });
}

function openGamesWindow() {
  if (gamesWindow && !gamesWindow.isDestroyed()) {
    gamesWindow.focus();
    return;
  }
  gamesWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: true,
    title: 'Games',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false // Prevent throttling when window is minimized
    }
  });
  if (gamesWindow && !gamesWindow.isDestroyed()) {
    gamesWindow.setMenu(null);
    gamesWindow.setMenuBarVisibility(false);
  }
  gamesWindow.loadFile('games.html');
  
  // Send purchased games state when games window is ready
  gamesWindow.webContents.once('did-finish-load', () => {
    gamesWindow.webContents.send('games:purchased', purchasedGames);
  });
  
  gamesWindow.on('closed', () => {
    gamesWindow = null;
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
  
  // Prevent buying eggs if player already has an egg (purchased or hatched)
  if ((itemId === 'egg1' || itemId === 'eggInter') && (hasEgg || isEggHatched)) {
    // Egg already purchased or pet exists - notify shop window
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('shop:purchaseFailed', { reason: 'pet_exists' });
    }
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
  
  // Track egg purchase
  if (itemId === 'egg1' || itemId === 'eggInter') {
    hasEgg = true;
    // Notify shop window that egg was purchased
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('pet:stateUpdate', { isEggHatched: isEggHatched, hasEgg: hasEgg });
    }
  }
  
  // Track game purchase
  if (itemId === 'slotMachine') {
    purchasedGames.slotMachine = true;
    // Rebuild menu to include the new game
    buildMenu();
    // Notify shop window that game was purchased
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('game:purchased', 'slotMachine');
    }
    // Notify games window if it's open
    if (gamesWindow && !gamesWindow.isDestroyed()) {
      gamesWindow.webContents.send('game:unlocked', 'slotMachine');
    }
  }
  
  if (itemId === 'solver') {
    purchasedGames.solver = true;
    // Rebuild menu to include the new game
    buildMenu();
    // Notify shop window that game was purchased
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('game:purchased', 'solver');
    }
    // Notify games window if it's open
    if (gamesWindow && !gamesWindow.isDestroyed()) {
      gamesWindow.webContents.send('game:unlocked', 'solver');
    }
  }
  
  if (itemId === 'shooter') {
    purchasedGames.shooter = true;
    // Rebuild menu to include the new game
    buildMenu();
    // Notify shop window that game was purchased
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('game:purchased', 'shooter');
    }
    // Notify games window if it's open
    if (gamesWindow && !gamesWindow.isDestroyed()) {
      gamesWindow.webContents.send('game:unlocked', 'shooter');
    }
  }
  
  if (itemId === 'snake') {
    purchasedGames.snake = true;
    // Rebuild menu to include the new game
    buildMenu();
    // Notify shop window that game was purchased
    if (shopWindow && !shopWindow.isDestroyed()) {
      shopWindow.webContents.send('game:purchased', 'snake');
    }
    // Notify games window if it's open
    if (gamesWindow && !gamesWindow.isDestroyed()) {
      gamesWindow.webContents.send('game:unlocked', 'snake');
    }
  }
  
  // Send money update to all windows
  sendMoneyUpdate();
  
  // Forward purchase to pet window to spawn item (only for items that spawn, not games)
  // Include costs in payload for items
  if (petWindow && !petWindow.isDestroyed() && payload.type !== 'game') {
    const spawnPayload = { ...payload };
    if (payload.type === 'food' && cost !== undefined) {
      spawnPayload.foodCost = cost;
    } else if (payload.type === 'medicine' && cost !== undefined) {
      spawnPayload.medicineCost = cost;
    } else if (payload.type === 'medkit' && cost !== undefined) {
      spawnPayload.medkitCost = cost;
    } else if (payload.type === 'toy' && cost !== undefined) {
      spawnPayload.toyCost = cost;
    }
    petWindow.webContents.send('shop:spawnItem', spawnPayload);
  }

  console.log(`Purchased ${itemId} for $${cost}. Remaining money: $${money}`);
});

// Handle food refund when user removes food item
ipcMain.on('food:refund', (_event, refundAmount) => {
  if (typeof refundAmount !== 'number' || refundAmount <= 0) return;
  
  // Add refund to money
  money += refundAmount;
  
  // Send money update to all windows
  sendMoneyUpdate();
  
  console.log(`Food refund: $${refundAmount}. New total: $${money}`);
});

// Handle item refund when user removes medicine or medkit item
ipcMain.on('item:refund', (_event, refundAmount) => {
  if (typeof refundAmount !== 'number' || refundAmount <= 0) return;
  
  // Add refund to money
  money += refundAmount;
  
  // Send money update to all windows
  sendMoneyUpdate();
  
  console.log(`Item refund: $${refundAmount}. New total: $${money}`);
});

// Handle egg hatching
ipcMain.on('egg:hatched', () => {
  isEggHatched = true;
  console.log('Egg has hatched! Stats decay will now start.');
  // Open name dialog window
  openNameDialog();
  // Rebuild menu to enable Actions and Games
  buildMenu();
  // Notify shop window that pet exists (disable egg button)
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.webContents.send('pet:stateUpdate', { isEggHatched: true, hasEgg: hasEgg });
  }
});

// Handle pet name submission
ipcMain.on('pet:nameSubmitted', (_event, name) => {
  petName = name;
  console.log(`Pet named: ${petName}`);
  
  // Update pet window title
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setTitle(petName);
  }
  
  // Close name dialog if it's still open
  if (nameDialogWindow && !nameDialogWindow.isDestroyed()) {
    nameDialogWindow.close();
  }
});

// Open name dialog window
function openNameDialog() {
  // Don't open if dialog is already open
  if (nameDialogWindow && !nameDialogWindow.isDestroyed()) {
    nameDialogWindow.focus();
    return;
  }

  nameDialogWindow = new BrowserWindow({
    width: 340,
    height: 180,
    resizable: false,
    modal: petWindow && !petWindow.isDestroyed(), // Only modal if pet window exists
    alwaysOnTop: true,
    frame: true,
    title: 'Name Your Pet',
    autoHideMenuBar: true,
    parent: (petWindow && !petWindow.isDestroyed()) ? petWindow : undefined, // Make it a modal of the pet window if available
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  nameDialogWindow.loadFile('name-dialog.html');

  // Center the dialog on the screen
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  nameDialogWindow.setPosition(
    Math.floor((width - 340) / 2),
    Math.floor((height - 180) / 2)
  );

  // Handle window close
  nameDialogWindow.on('closed', () => {
    nameDialogWindow = null;
  });

  // Prevent closing without entering a name (optional - you can remove this if you want)
  nameDialogWindow.on('close', (event) => {
    // Allow closing if pet already has a custom name
    if (petName !== 'Digital Pet') {
      return;
    }
    // Otherwise, prevent closing and show message
    // For now, we'll allow closing - user can set name later if needed
  });
}

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
  // Notify shop window to refresh sell preview and price
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.webContents.send('shop:petType', currentPetType, currentEvolutionStage);
    shopWindow.webContents.send('pet:stateUpdate', { isEggHatched: isEggHatched, hasEgg: hasEgg, petType: currentPetType, evolutionStage: currentEvolutionStage });
  }
});

// Handle pet type update (when egg hatches)
ipcMain.on('pet:typeUpdate', (_event, petType) => {
  currentPetType = petType;
  console.log(`Pet type set to: ${petType}`);
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

// Handle game window opening
let simonSaysWindow = null;
let memoryMatchWindow = null;
let reactionTimeWindow = null;
let slotMachineWindow = null;
let solverWindow = null;
let shooterWindow = null;
let snakeWindow = null;
ipcMain.on('game:open', (_event, gameName) => {
  if (gameName === 'simon-says') {
    openSimonSaysWindow();
  } else if (gameName === 'memory-match') {
    openMemoryMatchWindow();
  } else if (gameName === 'reaction-time') {
    openReactionTimeWindow();
  } else if (gameName === 'slot-machine') {
    openSlotMachineWindow();
  } else if (gameName === 'solver') {
    openSolverWindow();
  } else if (gameName === 'shooter') {
    openShooterWindow();
  } else if (gameName === 'snake') {
    openSnakeWindow();
  }
});


// Handle pet happiness animation trigger from game
ipcMain.on('game:petHappy', () => {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('game:petHappy');
  }
});

// Handle pet type request from game windows
ipcMain.on('game:requestPetType', (event) => {
  event.reply('game:petType', currentPetType, currentEvolutionStage);
});

// Handle purchased games request
ipcMain.on('games:requestPurchased', (event) => {
  event.reply('games:purchased', purchasedGames);
});

// Handle money update from slot machine
ipcMain.on('money:update', (_event, amount) => {
  money = amount;
  sendMoneyUpdate();
});

// Open Simon Says game window
function openSimonSaysWindow() {
  if (simonSaysWindow && !simonSaysWindow.isDestroyed()) {
    simonSaysWindow.focus();
    return;
  }
  simonSaysWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: true,
    title: 'Simon Says',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (simonSaysWindow && !simonSaysWindow.isDestroyed()) {
    simonSaysWindow.setMenu(null);
    simonSaysWindow.setMenuBarVisibility(false);
  }
  simonSaysWindow.loadFile('simon-says.html');
  
  // Send pet type to game window when it's ready
  simonSaysWindow.webContents.once('did-finish-load', () => {
    simonSaysWindow.webContents.send('game:petType', currentPetType, currentEvolutionStage);
  });
  
  simonSaysWindow.on('closed', () => {
    simonSaysWindow = null;
  });
}

// Open Memory Match game window
function openMemoryMatchWindow() {
  if (memoryMatchWindow && !memoryMatchWindow.isDestroyed()) {
    memoryMatchWindow.focus();
    return;
  }
  memoryMatchWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    title: 'Memory Match',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (memoryMatchWindow && !memoryMatchWindow.isDestroyed()) {
    memoryMatchWindow.setMenu(null);
    memoryMatchWindow.setMenuBarVisibility(false);
  }
  memoryMatchWindow.loadFile('memory-match.html');
  
  memoryMatchWindow.on('closed', () => {
    memoryMatchWindow = null;
  });
}

// Open Reaction Time game window
function openReactionTimeWindow() {
  if (reactionTimeWindow && !reactionTimeWindow.isDestroyed()) {
    reactionTimeWindow.focus();
    return;
  }
  reactionTimeWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: true,
    title: 'Reaction Time',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (reactionTimeWindow && !reactionTimeWindow.isDestroyed()) {
    reactionTimeWindow.setMenu(null);
    reactionTimeWindow.setMenuBarVisibility(false);
  }
  reactionTimeWindow.loadFile('reaction-time.html');
  
  // Send pet type to game window when it's ready
  reactionTimeWindow.webContents.once('did-finish-load', () => {
    reactionTimeWindow.webContents.send('game:petType', currentPetType, currentEvolutionStage);
  });
  
  reactionTimeWindow.on('closed', () => {
    reactionTimeWindow = null;
  });
}

// Open Slot Machine game window
function openSlotMachineWindow() {
  if (slotMachineWindow && !slotMachineWindow.isDestroyed()) {
    slotMachineWindow.focus();
    return;
  }
  slotMachineWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    title: 'Slot Machine',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (slotMachineWindow && !slotMachineWindow.isDestroyed()) {
    slotMachineWindow.setMenu(null);
    slotMachineWindow.setMenuBarVisibility(false);
  }
  slotMachineWindow.loadFile('slot-machine.html');
  slotMachineWindow.on('closed', () => {
    slotMachineWindow = null;
  });
}

// Open Solver game window
function openSolverWindow() {
  if (solverWindow && !solverWindow.isDestroyed()) {
    solverWindow.focus();
    return;
  }
  solverWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    title: 'Solver',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (solverWindow && !solverWindow.isDestroyed()) {
    solverWindow.setMenu(null);
    solverWindow.setMenuBarVisibility(false);
  }
  solverWindow.loadFile('solver.html');
  
  // Send pet type to game window when it's ready
  solverWindow.webContents.once('did-finish-load', () => {
    solverWindow.webContents.send('game:petType', currentPetType, currentEvolutionStage);
  });
  
  solverWindow.on('closed', () => {
    solverWindow = null;
  });
}

// Open Shooter game window
function openShooterWindow() {
  if (shooterWindow && !shooterWindow.isDestroyed()) {
    shooterWindow.focus();
    return;
  }
  shooterWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    title: 'Shooter',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (shooterWindow && !shooterWindow.isDestroyed()) {
    shooterWindow.setMenu(null);
    shooterWindow.setMenuBarVisibility(false);
  }
  shooterWindow.loadFile('shooter.html');
  
  shooterWindow.on('closed', () => {
    shooterWindow = null;
  });
}

// Open Snake game window
function openSnakeWindow() {
  if (snakeWindow && !snakeWindow.isDestroyed()) {
    snakeWindow.focus();
    return;
  }
  snakeWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    title: 'Snake',
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });
  if (snakeWindow && !snakeWindow.isDestroyed()) {
    snakeWindow.setMenu(null);
    snakeWindow.setMenuBarVisibility(false);
  }
  snakeWindow.loadFile('snake.html');
  
  // Send pet type to game window when it's ready
  snakeWindow.webContents.once('did-finish-load', () => {
    snakeWindow.webContents.send('game:petType', currentPetType, currentEvolutionStage);
  });
  
  snakeWindow.on('closed', () => {
    snakeWindow = null;
  });
}

// Provide pet type to shop window on request
ipcMain.on('shop:requestPetType', (event) => {
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.webContents.send('shop:petType', currentPetType, currentEvolutionStage);
  } else {
    event.reply('shop:petType', currentPetType, currentEvolutionStage);
  }
});

// Handle selling pet
ipcMain.on('shop:sellPet', (_event, payload) => {
  const price = typeof payload?.price === 'number' ? payload.price : 0;
  // Increase money
  money += price;
  // Reset pet flags
  hasEgg = false;
  isEggHatched = false;
  // Reset evolution stage and set default type
  currentEvolutionStage = 1;
  currentPetType = 'botamon';
  // Reset stored stats to defaults
  const defaults = {
    hunger: { value: 50, max: 100 },
    rest: { value: 50, max: 100 },
    health: { value: 50, max: 100 },
    happiness: { value: 50, max: 100 },
    experience: { value: 0, max: 300 }
  };
  Object.keys(defaults).forEach(key => {
    storedStats[key] = defaults[key];
  });
  // Notify windows of updates
  if (petWindow && !petWindow.isDestroyed()) {
    // Update money immediately in pet window
    petWindow.webContents.send('money:update', money);
    // Update stats in pet window
    Object.keys(defaults).forEach(key => {
      petWindow.webContents.send('stats:update', { key, value: defaults[key].value, max: defaults[key].max });
    });
    // Notify pet window to hide pet until egg is purchased again
    petWindow.webContents.send('pet:stateUpdate', { isEggHatched: false, hasEgg: false });
    // Also reset evolution stage/type
    petWindow.webContents.send('pet:evolutionStage', currentEvolutionStage);
    petWindow.webContents.send('pet:typeUpdate', currentPetType);
  }
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.webContents.send('money:update', money);
    shopWindow.webContents.send('pet:stateUpdate', { isEggHatched: false, hasEgg: false, petType: currentPetType, evolutionStage: currentEvolutionStage });
    // Close the shop after selling
    try { shopWindow.close(); } catch (_) {}
  }
  if (statsWindow && !statsWindow.isDestroyed()) {
    Object.keys(defaults).forEach(key => {
      if (key !== 'experience') {
        statsWindow.webContents.send('stats:update', { key, value: defaults[key].value, max: defaults[key].max });
      }
    });
  }
});
// Handle game rewards
ipcMain.on('game:reward', (_event, rewards) => {
  // rewards should be an object with: { money, happiness, experience, hunger, rest }
  if (rewards.money) {
    money += rewards.money;
    sendMoneyUpdate();
  }
  if (rewards.happiness && storedStats.happiness) {
    const currentHappiness = storedStats.happiness.value;
    const newHappiness = Math.min(100, Math.max(0, currentHappiness + rewards.happiness));
    storedStats.happiness.value = newHappiness;
    
    // Send update to pet window
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'happiness',
        value: newHappiness,
        max: 100
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'happiness',
        value: newHappiness,
        max: 100
      });
    }
  }
  if (rewards.experience && storedStats.experience) {
    const currentExp = storedStats.experience.value;
    const newExp = Math.min(300, currentExp + rewards.experience);
    storedStats.experience.value = newExp;
    
    // Send update to pet window
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'experience',
        value: newExp,
        max: 300
      });
    }
  }
  if (rewards.hunger && storedStats.hunger) {
    const currentHunger = storedStats.hunger.value;
    const newHunger = Math.min(100, Math.max(0, currentHunger + rewards.hunger));
    storedStats.hunger.value = newHunger;
    
    // Send update to pet window
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'hunger',
        value: newHunger,
        max: 100
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'hunger',
        value: newHunger,
        max: 100
      });
    }
  }
  if (rewards.rest && storedStats.rest) {
    const currentRest = storedStats.rest.value;
    const newRest = Math.min(100, Math.max(0, currentRest + rewards.rest));
    storedStats.rest.value = newRest;
    
    // Send update to pet window
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'rest',
        value: newRest,
        max: 100
      });
    }
    
    // Forward to stats window if it's open
    if (statsWindow && !statsWindow.isDestroyed()) {
      statsWindow.webContents.send('stats:update', {
        key: 'rest',
        value: newRest,
        max: 100
      });
    }
  }
  
  console.log(`Game rewards: +$${rewards.money || 0}, +${rewards.happiness || 0} happiness, +${rewards.experience || 0} exp, ${rewards.hunger || 0} hunger, ${rewards.rest || 0} rest`);
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
  
  // Set up interval to decrease hunger every 2 minutes
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
      storedStats.experience = { value: 0, max: 300 };
    }
    const currentExp = storedStats.experience.value;
    const newExp = Math.min(300, currentExp + EXERCISE_EXP_GAIN);
    storedStats.experience.value = newExp;
    
    // Send experience update to pet window (but not to stats window, as it's hidden)
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('stats:update', {
        key: 'experience',
        value: newExp,
        max: 300
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

