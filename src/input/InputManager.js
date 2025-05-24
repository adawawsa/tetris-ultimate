export class InputManager {
    constructor() {
        this.keyBindings = {
            ArrowLeft: 'moveLeft',
            ArrowRight: 'moveRight',
            ArrowDown: 'softDrop',
            ArrowUp: 'rotateRight',
            ' ': 'hardDrop',
            z: 'rotateLeft',
            Z: 'rotateLeft',
            x: 'rotateRight',
            X: 'rotateRight',
            c: 'hold',
            C: 'hold',
            Shift: 'hold',
            p: 'pause',
            P: 'pause',
            Escape: 'pause'
        };
        
        this.listeners = new Map();
        this.activeKeys = new Set();
        this.keyRepeatTimers = new Map();
        this.keyRepeatDelay = 170;
        this.keyRepeatInterval = 50;
        
        this.touchStartPositions = new Map();
        this.swipeThreshold = 50;
        
        this.bindingMode = false;
        this.bindingButton = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch events for mobile
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Gamepad support
        this.setupGamepadSupport();
        
        // Prevent context menu on game area
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }
    
    handleKeyDown(e) {
        // Handle key binding mode
        if (this.bindingMode) {
            e.preventDefault();
            this.completeKeyBinding(e.key);
            return;
        }
        
        const action = this.keyBindings[e.key];
        if (!action) return;
        
        e.preventDefault();
        
        if (!this.activeKeys.has(e.key)) {
            this.activeKeys.add(e.key);
            this.emit('keydown', action);
            
            // Setup key repeat for movement and soft drop
            if (['moveLeft', 'moveRight', 'softDrop'].includes(action)) {
                this.startKeyRepeat(e.key, action);
            }
        }
    }
    
    handleKeyUp(e) {
        const action = this.keyBindings[e.key];
        if (!action) return;
        
        e.preventDefault();
        
        this.activeKeys.delete(e.key);
        this.stopKeyRepeat(e.key);
        this.emit('keyup', action);
    }
    
    startKeyRepeat(key, action) {
        // Clear any existing timer
        this.stopKeyRepeat(key);
        
        // Start repeat after delay
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                if (this.activeKeys.has(key)) {
                    this.emit('keyhold', action);
                } else {
                    clearInterval(interval);
                }
            }, this.keyRepeatInterval);
            
            this.keyRepeatTimers.set(key, { interval });
        }, this.keyRepeatDelay);
        
        this.keyRepeatTimers.set(key, { timeout: timer });
    }
    
    stopKeyRepeat(key) {
        const timers = this.keyRepeatTimers.get(key);
        if (timers) {
            if (timers.timeout) clearTimeout(timers.timeout);
            if (timers.interval) clearInterval(timers.interval);
            this.keyRepeatTimers.delete(key);
        }
    }
    
    handleTouchStart(e) {
        for (const touch of e.changedTouches) {
            this.touchStartPositions.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            });
        }
    }
    
    handleTouchMove(e) {
        // Prevent scrolling while playing
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }
    
    handleTouchEnd(e) {
        for (const touch of e.changedTouches) {
            const start = this.touchStartPositions.get(touch.identifier);
            if (!start) continue;
            
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            const dt = Date.now() - start.time;
            
            // Detect swipe gestures
            if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    this.emit('touch', dx > 0 ? 'moveRight' : 'moveLeft');
                } else {
                    // Vertical swipe
                    if (dy > 0) {
                        this.emit('touch', 'softDrop');
                    } else {
                        this.emit('touch', 'rotateRight');
                    }
                }
            } else if (dt < 200) {
                // Tap
                const gameCanvas = document.getElementById('game-canvas');
                if (gameCanvas) {
                    const rect = gameCanvas.getBoundingClientRect();
                    const x = touch.clientX - rect.left;
                    const centerX = rect.width / 2;
                    
                    // Tap on left or right side
                    if (x < centerX - 50) {
                        this.emit('touch', 'rotateLeft');
                    } else if (x > centerX + 50) {
                        this.emit('touch', 'rotateRight');
                    } else {
                        this.emit('touch', 'hardDrop');
                    }
                }
            }
            
            this.touchStartPositions.delete(touch.identifier);
        }
    }
    
    handleTouch(action, type) {
        if (type === 'start' || type === 'tap') {
            this.emit('touch', action);
            
            // Start repeat for movement
            if (type === 'start' && ['moveLeft', 'moveRight', 'softDrop'].includes(action)) {
                this.startTouchRepeat(action);
            }
        } else if (type === 'end') {
            this.stopTouchRepeat(action);
        }
    }
    
    startTouchRepeat(action) {
        const key = `touch_${action}`;
        this.activeKeys.add(key);
        this.startKeyRepeat(key, action);
    }
    
    stopTouchRepeat(action) {
        const key = `touch_${action}`;
        this.activeKeys.delete(key);
        this.stopKeyRepeat(key);
    }
    
    setupGamepadSupport() {
        const gamepadActions = {
            0: 'hardDrop',    // A button
            1: 'rotateRight', // B button
            2: 'rotateLeft',  // X button
            3: 'hold',        // Y button
            9: 'pause',       // Start button
            12: 'moveUp',     // D-pad up
            13: 'softDrop',   // D-pad down
            14: 'moveLeft',   // D-pad left
            15: 'moveRight'   // D-pad right
        };
        
        let previousButtons = [];
        
        const pollGamepads = () => {
            const gamepads = navigator.getGamepads();
            
            for (const gamepad of gamepads) {
                if (!gamepad) continue;
                
                // Check buttons
                gamepad.buttons.forEach((button, index) => {
                    if (button.pressed && !previousButtons[index]) {
                        const action = gamepadActions[index];
                        if (action) {
                            this.emit('keydown', action);
                        }
                    } else if (!button.pressed && previousButtons[index]) {
                        const action = gamepadActions[index];
                        if (action) {
                            this.emit('keyup', action);
                        }
                    }
                });
                
                // Check analog sticks
                const deadzone = 0.5;
                if (Math.abs(gamepad.axes[0]) > deadzone) {
                    this.emit('keydown', gamepad.axes[0] > 0 ? 'moveRight' : 'moveLeft');
                }
                if (gamepad.axes[1] > deadzone) {
                    this.emit('keydown', 'softDrop');
                }
                
                previousButtons = gamepad.buttons.map(b => b.pressed);
            }
            
            requestAnimationFrame(pollGamepads);
        };
        
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            pollGamepads();
        });
    }
    
    startKeyBinding(button) {
        this.bindingMode = true;
        this.bindingButton = button;
        button.classList.add('binding');
        button.textContent = '...';
    }
    
    completeKeyBinding(key) {
        if (!this.bindingButton) return;
        
        const action = this.bindingButton.dataset.action;
        
        // Remove old binding
        for (const [k, a] of Object.entries(this.keyBindings)) {
            if (a === action) {
                delete this.keyBindings[k];
            }
        }
        
        // Set new binding
        this.keyBindings[key] = action;
        
        // Update button display
        this.bindingButton.textContent = key;
        this.bindingButton.classList.remove('binding');
        
        // Save to settings
        this.saveKeyBindings();
        
        // Reset binding mode
        this.bindingMode = false;
        this.bindingButton = null;
    }
    
    saveKeyBindings() {
        localStorage.setItem('tetris-ultimate-keybindings', JSON.stringify(this.keyBindings));
    }
    
    loadKeyBindings() {
        const saved = localStorage.getItem('tetris-ultimate-keybindings');
        if (saved) {
            this.keyBindings = JSON.parse(saved);
        }
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
    
    removeAllListeners() {
        this.listeners.clear();
        this.activeKeys.clear();
        
        // Clear all timers
        for (const [key, timers] of this.keyRepeatTimers) {
            if (timers.timeout) clearTimeout(timers.timeout);
            if (timers.interval) clearInterval(timers.interval);
        }
        this.keyRepeatTimers.clear();
    }
}