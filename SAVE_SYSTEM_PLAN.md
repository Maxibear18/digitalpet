# Save System Implementation Plan

## Overview
Implement a local file-based save system that persists game state between sessions and works in both development and when packaged as an .exe file.

## Save Location
- **Development**: `%APPDATA%/digitalpet/save.json` (Windows)
- **Production**: Same location - `app.getPath('userData')` works in both dev and packaged apps
- **Cross-platform**: Electron's `app.getPath('userData')` automatically handles:
  - Windows: `%APPDATA%/digitalpet/`
  - macOS: `~/Library/Application Support/digitalpet/`
  - Linux: `~/.config/digitalpet/`

## Data to Save

### Pet State
- `petName` - Pet's name
- `currentPetType` - Current pet type (botamon, koromon, etc.)
- `currentEvolutionStage` - Evolution stage (1, 2, 3, etc.)
- `isEggHatched` - Whether egg has hatched
- `hasEgg` - Whether player has purchased an egg

### Pet Stats
- `storedStats.health.value` - Health value
- `storedStats.health.max` - Health max
- `storedStats.rest.value` - Rest value
- `storedStats.rest.max` - Rest max
- `storedStats.hunger.value` - Hunger value
- `storedStats.hunger.max` - Hunger max
- `storedStats.happiness.value` - Happiness value
- `storedStats.happiness.max` - Happiness max
- `storedStats.experience.value` - Experience value
- `storedStats.experience.max` - Experience max

### Pet Status Flags
- `isPetSleeping` - Is pet currently sleeping
- `isPetExercising` - Is pet currently exercising
- `isPetSick` - Is pet sick
- `isPetDead` - Is pet dead
- `wasteCount` - Waste count for sickness calculation

### Game Progress
- `money` - Player's money
- `purchasedGames` - Object with all purchased games:
  - `slotMachine: boolean`
  - `solver: boolean`
  - `shooter: boolean`
  - `snake: boolean`

### Timestamps (Optional - for time-based features)
- `lastSaveTime` - When game was last saved (for calculating time passed)
- `lastMoneyIncrement` - Last time money was incremented (optional)

## Implementation Strategy

### 1. Create Save Manager Module (`saveManager.js`)
- **Functions**:
  - `getSavePath()` - Returns path to save file
  - `loadSave()` - Loads save data from file, returns default if file doesn't exist
  - `saveGame(data)` - Saves game state to file
  - `deleteSave()` - Deletes save file (for reset/new game)

### 2. Save Triggers
- **Auto-save on state changes**:
  - When stats change (health, hunger, happiness, rest, experience)
  - When money changes
  - When pet evolves
  - When games are purchased
  - When pet name changes
  - When pet state changes (sleep, exercise, sick, dead)

- **Manual save**:
  - On app close (`app.on('before-quit')`)
  - On window close (if needed)

- **Periodic auto-save** (optional):
  - Every 30 seconds or 1 minute as backup

### 3. Load on Startup
- Load save data when app starts (`app.whenReady()`)
- Apply loaded data to all state variables
- If no save exists, use default values

### 4. Error Handling
- Try-catch around file operations
- Fallback to defaults if save file is corrupted
- Log errors to console (or file) for debugging

## File Format (JSON)
```json
{
  "version": "1.0.0",
  "petName": "Digital Pet",
  "currentPetType": "botamon",
  "currentEvolutionStage": 1,
  "isEggHatched": false,
  "hasEgg": false,
  "storedStats": {
    "health": { "value": 50, "max": 100 },
    "rest": { "value": 50, "max": 100 },
    "hunger": { "value": 50, "max": 100 },
    "happiness": { "value": 50, "max": 100 },
    "experience": { "value": 0, "max": 300 }
  },
  "isPetSleeping": false,
  "isPetExercising": false,
  "isPetSick": false,
  "isPetDead": false,
  "wasteCount": 0,
  "money": 1500,
  "purchasedGames": {
    "slotMachine": false,
    "solver": false,
    "shooter": false,
    "snake": false
  },
  "lastSaveTime": "2024-01-01T00:00:00.000Z"
}
```

## Implementation Steps

1. **Create `saveManager.js`** - Core save/load functionality
2. **Integrate into `main.js`**:
   - Load save on app start
   - Add save calls after state changes
   - Save on app close
3. **Add versioning** - For future save file migrations
4. **Test** - Verify saves work in dev and packaged app
5. **Add menu option** (optional) - "New Game" to reset save

## Benefits
- ✅ Works in development and production (.exe)
- ✅ No external dependencies (uses Node.js built-in `fs`)
- ✅ Cross-platform compatible
- ✅ Automatic save location management
- ✅ Easy to extend with more data later

## Future Enhancements
- Multiple save slots
- Save file encryption (if needed)
- Cloud sync (optional)
- Save file backup/restore

