const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Save file version for future migrations
const SAVE_VERSION = '1.0.0';
const SAVE_FILE_NAME = 'save.json';

/**
 * Get the path to the save file
 * Uses app.getPath('userData') which works in both dev and production
 */
function getSavePath() {
    const userDataPath = app.getPath('userData');
    // Create app-specific directory
    const saveDir = path.join(userDataPath, 'digitalpet');
    
    // Ensure directory exists
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }
    
    return path.join(saveDir, SAVE_FILE_NAME);
}

/**
 * Get default save data structure
 */
function getDefaultSaveData() {
    return {
        version: SAVE_VERSION,
        petName: 'Digital Pet',
        currentPetType: 'botamon',
        currentEvolutionStage: 1,
        isEggHatched: false,
        hasEgg: false,
        storedStats: {
            health: { value: 50, max: 100 },
            rest: { value: 50, max: 100 },
            hunger: { value: 50, max: 100 },
            happiness: { value: 50, max: 100 },
            experience: { value: 0, max: 300 }
        },
        isPetSleeping: false,
        isPetExercising: false,
        isPetSick: false,
        isPetDead: false,
        wasteCount: 0,
        money: 1500,
        purchasedGames: {
            slotMachine: false,
            solver: false,
            shooter: false,
            snake: false
        },
        activeToys: [],
        lastSaveTime: new Date().toISOString(),
        timerStates: {}
    };
}

/**
 * Load save data from file
 * Returns default data if file doesn't exist or is corrupted
 */
function loadSave() {
    const savePath = getSavePath();
    
    try {
        // Check if save file exists
        if (!fs.existsSync(savePath)) {
            console.log('No save file found, using defaults');
            return getDefaultSaveData();
        }
        
        // Read and parse save file
        const saveData = fs.readFileSync(savePath, 'utf8');
        const parsed = JSON.parse(saveData);
        
        // Validate version (for future migrations)
        if (!parsed.version) {
            console.log('Save file missing version, using defaults');
            return getDefaultSaveData();
        }
        
        // Merge with defaults to handle missing fields (backward compatibility)
        const defaultData = getDefaultSaveData();
        const merged = { ...defaultData, ...parsed };
        
        // Ensure nested objects are merged properly
        merged.storedStats = { ...defaultData.storedStats, ...(parsed.storedStats || {}) };
        merged.purchasedGames = { ...defaultData.purchasedGames, ...(parsed.purchasedGames || {}) };
        
        console.log('Save file loaded successfully');
        return merged;
        
    } catch (error) {
        console.error('Error loading save file:', error);
        console.log('Using default save data');
        return getDefaultSaveData();
    }
}

/**
 * Save game data to file
 * @param {Object} gameState - The current game state to save
 */
function saveGame(gameState) {
    const savePath = getSavePath();
    
    try {
        // Prepare save data
        const saveData = {
            version: SAVE_VERSION,
            petName: gameState.petName || 'Digital Pet',
            currentPetType: gameState.currentPetType || 'botamon',
            currentEvolutionStage: gameState.currentEvolutionStage || 1,
            isEggHatched: gameState.isEggHatched || false,
            hasEgg: gameState.hasEgg || false,
            storedStats: {
                health: gameState.storedStats?.health || { value: 50, max: 100 },
                rest: gameState.storedStats?.rest || { value: 50, max: 100 },
                hunger: gameState.storedStats?.hunger || { value: 50, max: 100 },
                happiness: gameState.storedStats?.happiness || { value: 50, max: 100 },
                experience: gameState.storedStats?.experience || { value: 0, max: 300 }
            },
            isPetSleeping: gameState.isPetSleeping || false,
            isPetExercising: gameState.isPetExercising || false,
            isPetSick: gameState.isPetSick || false,
            isPetDead: gameState.isPetDead || false,
            wasteCount: gameState.wasteCount || 0,
        money: gameState.money || 1500,
        purchasedGames: {
            slotMachine: gameState.purchasedGames?.slotMachine || false,
            solver: gameState.purchasedGames?.solver || false,
            shooter: gameState.purchasedGames?.shooter || false,
            snake: gameState.purchasedGames?.snake || false
        },
        activeToys: gameState.activeToys || [],
        lastSaveTime: new Date().toISOString(),
        // Timer states for pause/resume
        timerStates: gameState.timerStates || {}
        };
        
        // Write to file
        fs.writeFileSync(savePath, JSON.stringify(saveData, null, 2), 'utf8');
        console.log('Game saved successfully');
        return true;
        
    } catch (error) {
        console.error('Error saving game:', error);
        return false;
    }
}

/**
 * Delete save file (for new game/reset)
 */
function deleteSave() {
    const savePath = getSavePath();
    
    try {
        if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath);
            console.log('Save file deleted');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting save file:', error);
        return false;
    }
}

/**
 * Get current game state from main process variables
 * This function will be called with the current state object
 */
function getCurrentGameState(state) {
    return {
        petName: state.petName,
        currentPetType: state.currentPetType,
        currentEvolutionStage: state.currentEvolutionStage,
        isEggHatched: state.isEggHatched,
        hasEgg: state.hasEgg,
        storedStats: state.storedStats,
        isPetSleeping: state.isPetSleeping,
        isPetExercising: state.isPetExercising,
        isPetSick: state.isPetSick,
        isPetDead: state.isPetDead,
        wasteCount: state.wasteCount,
        money: state.money,
        purchasedGames: state.purchasedGames
    };
}

module.exports = {
    loadSave,
    saveGame,
    deleteSave,
    getCurrentGameState,
    getDefaultSaveData
};

