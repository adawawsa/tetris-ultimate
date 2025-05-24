export class SettingsManager {
    constructor() {
        this.storageKey = 'tetris-ultimate-settings';
        this.defaultSettings = {
            // Graphics
            particlesEnabled: true,
            ghostEnabled: true,
            gridEnabled: true,
            animations: true,
            
            // Audio
            bgmVolume: 0.5,
            sfxVolume: 0.7,
            masterVolume: 1.0,
            
            // Game
            das: 170,  // Delayed Auto Shift
            arr: 50,   // Auto Repeat Rate
            sdf: 5,    // Soft Drop Factor
            
            // Controls
            sensitivity: 1.0,
            vibration: true,
            
            // Profile
            playerName: 'Player 1',
            avatar: 'default',
            
            // Display
            theme: 'neon',
            colorBlind: false,
            highContrast: false,
            
            // Performance
            quality: 'high',
            fps: 60
        };
        
        this.settings = { ...this.defaultSettings };
        this.listeners = new Map();
    }
    
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.defaultSettings, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
        
        this.applySettings();
    }
    
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }
    
    get(key) {
        return this.settings[key];
    }
    
    set(key, value) {
        const oldValue = this.settings[key];
        this.settings[key] = value;
        
        if (oldValue !== value) {
            this.save();
            this.notifyListeners(key, value, oldValue);
        }
    }
    
    reset() {
        this.settings = { ...this.defaultSettings };
        this.save();
        this.applySettings();
    }
    
    applySettings() {
        // Apply theme
        document.body.dataset.theme = this.settings.theme;
        
        // Apply accessibility settings
        if (this.settings.colorBlind) {
            document.body.classList.add('color-blind-mode');
        } else {
            document.body.classList.remove('color-blind-mode');
        }
        
        if (this.settings.highContrast) {
            document.body.classList.add('high-contrast-mode');
        } else {
            document.body.classList.remove('high-contrast-mode');
        }
        
        // Apply quality settings
        this.applyQualitySettings();
        
        // Update UI elements
        this.updateUIElements();
    }
    
    applyQualitySettings() {
        const root = document.documentElement;
        
        switch (this.settings.quality) {
            case 'low':
                root.style.setProperty('--particle-count', '50');
                root.style.setProperty('--animation-quality', 'low');
                break;
            case 'medium':
                root.style.setProperty('--particle-count', '200');
                root.style.setProperty('--animation-quality', 'medium');
                break;
            case 'high':
                root.style.setProperty('--particle-count', '500');
                root.style.setProperty('--animation-quality', 'high');
                break;
        }
    }
    
    updateUIElements() {
        // Update settings modal inputs
        const particlesCheckbox = document.getElementById('particles-enabled');
        if (particlesCheckbox) {
            particlesCheckbox.checked = this.settings.particlesEnabled;
        }
        
        const ghostCheckbox = document.getElementById('ghost-enabled');
        if (ghostCheckbox) {
            ghostCheckbox.checked = this.settings.ghostEnabled;
        }
        
        const gridCheckbox = document.getElementById('grid-enabled');
        if (gridCheckbox) {
            gridCheckbox.checked = this.settings.gridEnabled;
        }
        
        const bgmSlider = document.getElementById('bgm-volume');
        if (bgmSlider) {
            bgmSlider.value = this.settings.bgmVolume * 100;
        }
        
        const sfxSlider = document.getElementById('sfx-volume');
        if (sfxSlider) {
            sfxSlider.value = this.settings.sfxVolume * 100;
        }
    }
    
    onChange(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
    
    offChange(key, callback) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    notifyListeners(key, newValue, oldValue) {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
            callbacks.forEach(callback => callback(newValue, oldValue));
        }
    }
    
    export() {
        return JSON.stringify(this.settings, null, 2);
    }
    
    import(data) {
        try {
            const imported = JSON.parse(data);
            this.settings = { ...this.defaultSettings, ...imported };
            this.save();
            this.applySettings();
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }
}