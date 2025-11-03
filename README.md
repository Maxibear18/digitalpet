# Digital Pet Desktop App 🐾

A cute desktop pet application built with Electron and JavaScript.

## Features

- 🎨 Transparent window that stays on top
- 🖱️ Draggable pet
- 💫 Animated floating idle state
- 🖼️ Pixel-perfect sprite rendering

## Setup Instructions

1. **Install Node.js** (if you haven't already)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add your pet sprite**
   - Place `botamon.png` in the `sprites/` folder

4. **Run the app**
   ```bash
   npm start
   ```

## How to Use

- **Drag the pet**: Click and drag Botamon around your desktop
- **Quit**: Press `Ctrl+C` in the terminal or close the terminal

## Project Structure

```
digitalpet-1/
├── main.js          # Main Electron process
├── index.html       # Pet display
├── styles.css       # Styling and animations
├── renderer.js      # Pet interaction logic
├── package.json     # Dependencies
├── sprites/         # Pet sprite images
└── README.md        # This file
```

## Future Features (Coming Soon!)

- 🍎 Feed your pet
- 🎮 Mini games
- 💝 Pet emotions and states
- 🚶 Auto-walking along taskbar
- 🎁 Random gifts and surprises

## License

MIT

