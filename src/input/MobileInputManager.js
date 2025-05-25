export class MobileInputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isSwiping = false;
        this.swipeThreshold = 50;
        this.tapThreshold = 200; // ms
        this.holdTimer = null;
        this.repeatTimer = null;
        this.vibrationEnabled = true;
        
        // Control mapping
        this.controls = {
            left: 'moveLeft',
            right: 'moveRight', 
            down: 'softDrop',
            rotate: 'rotateRight',
            drop: 'hardDrop',
            hold: 'holdPiece'
        };
        
        this.setupTouchControls();
        this.setupSwipeGestures();
        this.checkVibrationSupport();
    }
    
    checkVibrationSupport() {
        this.vibrationEnabled = 'vibrate' in navigator;
    }
    
    vibrate(pattern = 10) {
        if (this.vibrationEnabled) {
            navigator.vibrate(pattern);
        }
    }
    
    setupTouchControls() {
        // Create mobile controls if they don't exist
        if (!document.querySelector('.mobile-controls')) {
            this.createMobileControls();
        }
        
        // Button event handlers
        const buttons = document.querySelectorAll('.touch-button');
        buttons.forEach(button => {
            const action = button.dataset.action;
            
            // Touch start
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleButtonPress(action);
                this.vibrate(10);
                
                // Visual feedback
                button.classList.add('active');
                
                // Start repeat for movement and soft drop
                if (['left', 'right', 'down'].includes(action)) {
                    this.startRepeat(action);
                }
            });
            
            // Touch end
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopRepeat();
                button.classList.remove('active');
            });
            
            // Touch cancel
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.stopRepeat();
                button.classList.remove('active');
            });
        });
    }
    
    setupSwipeGestures() {
        const gameCanvas = document.getElementById('game-canvas');
        if (!gameCanvas) return;
        
        // Create gesture overlay
        const gestureZone = document.createElement('div');
        gestureZone.className = 'gesture-zone';
        gameCanvas.parentElement.appendChild(gestureZone);
        
        // Touch start
        gestureZone.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
            this.isSwiping = false;
        });
        
        // Touch move
        gestureZone.addEventListener('touchmove', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            
            // Detect swipe direction
            if (!this.isSwiping && (Math.abs(deltaX) > this.swipeThreshold || Math.abs(deltaY) > this.swipeThreshold)) {
                this.isSwiping = true;
                
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe
                    if (deltaX > 0) {
                        this.handleSwipe('right');
                    } else {
                        this.handleSwipe('left');
                    }
                } else {
                    // Vertical swipe
                    if (deltaY > 0) {
                        this.handleSwipe('down');
                    } else {
                        this.handleSwipe('up');
                    }
                }
                
                // Reset for next swipe
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
            }
        });
        
        // Touch end
        gestureZone.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - this.touchStartTime;
            
            // Detect tap
            if (!this.isSwiping && touchDuration < this.tapThreshold) {
                this.handleTap();
            }
            
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.isSwiping = false;
        });
    }
    
    createMobileControls() {
        const controls = document.createElement('div');
        controls.className = 'mobile-controls';
        controls.innerHTML = `
            <button class="touch-button touch-rotate" data-action="rotate">
                <span>↻</span>
                <span class="button-label">回転</span>
            </button>
            <button class="touch-button touch-left" data-action="left">
                <span>◀</span>
            </button>
            <button class="touch-button touch-down" data-action="down">
                <span>▼</span>
            </button>
            <button class="touch-button touch-right" data-action="right">
                <span>▶</span>
            </button>
            <button class="touch-button touch-hold" data-action="hold">
                <span>HOLD</span>
            </button>
            <button class="touch-button touch-drop" data-action="drop">
                <span>⬇</span>
                <span class="button-label">DROP</span>
            </button>
        `;
        
        document.querySelector('.game-container').appendChild(controls);
    }
    
    createMobileHUD() {
        const hud = document.createElement('div');
        hud.className = 'mobile-hud';
        hud.innerHTML = `
            <div class="hud-item">
                <div class="hud-label">SCORE</div>
                <div class="hud-value" id="mobile-score">0</div>
            </div>
            <div class="hud-item">
                <div class="hud-label">LINES</div>
                <div class="hud-value" id="mobile-lines">0</div>
            </div>
            <div class="hud-item">
                <div class="hud-label">LEVEL</div>
                <div class="hud-value" id="mobile-level">1</div>
            </div>
        `;
        
        const gameContent = document.querySelector('.game-content');
        gameContent.insertBefore(hud, gameContent.firstChild);
    }
    
    handleButtonPress(action) {
        const gameAction = this.controls[action];
        if (gameAction && this.game[gameAction]) {
            this.game[gameAction]();
        }
    }
    
    handleSwipe(direction) {
        this.vibrate(20);
        
        // Show swipe indicator
        this.showSwipeIndicator();
        
        switch (direction) {
            case 'left':
                this.game.moveLeft();
                break;
            case 'right':
                this.game.moveRight();
                break;
            case 'down':
                this.game.hardDrop();
                break;
            case 'up':
                // Quick drop (not hard drop)
                for (let i = 0; i < 5; i++) {
                    this.game.softDrop();
                }
                break;
        }
    }
    
    handleTap() {
        this.vibrate(10);
        this.game.rotateRight();
    }
    
    startRepeat(action) {
        // Initial delay before repeat
        this.holdTimer = setTimeout(() => {
            this.repeatTimer = setInterval(() => {
                this.handleButtonPress(action);
                this.vibrate(5);
            }, 50); // Repeat rate
        }, 200); // Initial delay
    }
    
    stopRepeat() {
        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
        if (this.repeatTimer) {
            clearInterval(this.repeatTimer);
            this.repeatTimer = null;
        }
    }
    
    showSwipeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'swipe-indicator';
        document.querySelector('.main-game-area').appendChild(indicator);
        
        indicator.style.display = 'block';
        setTimeout(() => indicator.remove(), 500);
    }
    
    updateHUD(stats) {
        // Update mobile HUD values
        const scoreEl = document.getElementById('mobile-score');
        const linesEl = document.getElementById('mobile-lines');
        const levelEl = document.getElementById('mobile-level');
        
        if (scoreEl) scoreEl.textContent = stats.score.toLocaleString();
        if (linesEl) linesEl.textContent = stats.lines;
        if (levelEl) levelEl.textContent = stats.level;
    }
    
    destroy() {
        this.stopRepeat();
        
        // Remove event listeners
        const buttons = document.querySelectorAll('.touch-button');
        buttons.forEach(button => {
            button.removeEventListener('touchstart', () => {});
            button.removeEventListener('touchend', () => {});
            button.removeEventListener('touchcancel', () => {});
        });
        
        // Remove gesture zone
        const gestureZone = document.querySelector('.gesture-zone');
        if (gestureZone) {
            gestureZone.remove();
        }
    }
    
    // Helper method to detect mobile device
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }
    
    // Optimize canvas for mobile
    static optimizeCanvasForMobile(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Get device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Get display size
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        
        // Set actual size in memory
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // Scale the drawing context
        ctx.scale(dpr, dpr);
        
        // Ensure canvas stays crisp
        canvas.style.imageRendering = 'pixelated';
        canvas.style.imageRendering = 'crisp-edges';
        
        return ctx;
    }
}