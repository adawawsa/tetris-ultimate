export class SoundManager {
    constructor() {
        this.sounds = {};
        this.bgm = null;
        this.bgmVolume = 0.5;
        this.sfxVolume = 0.7;
        this.enabled = true;
        
        // Sound configurations
        this.soundConfigs = {
            // UI Sounds
            menuClick: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.5 },
            menuHover: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.3 },
            
            // Game Sounds
            move: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.4 },
            rotate: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.5 },
            lock: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.6 },
            hardDrop: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.7 },
            hold: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.5 },
            
            // Clear Sounds
            lineClear: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.8 },
            tetris: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 1.0 },
            tspin: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.9 },
            perfectClear: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 1.0 },
            
            // Special Sounds
            b2b: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.8 },
            combo: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.7 },
            levelUp: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 1.0 },
            
            // System Sounds
            pause: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.6 },
            gameOver: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.8 },
            countdown: { url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', volume: 0.7 }
        };
    }
    
    async initialize() {
        try {
            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load all sounds
            await this.loadSounds();
            
            // Setup audio nodes
            this.masterGain = this.audioContext.createGain();
            this.bgmGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            this.bgmGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.bgmGain.gain.value = this.bgmVolume;
            this.sfxGain.gain.value = this.sfxVolume;
            
            // Create procedural sounds
            this.createProceduralSounds();
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.enabled = false;
        }
    }
    
    async loadSounds() {
        // In a real implementation, these would load actual sound files
        // For now, we'll create procedural sounds
        for (const [name, config] of Object.entries(this.soundConfigs)) {
            this.sounds[name] = {
                buffer: await this.createSound(name),
                volume: config.volume
            };
        }
    }
    
    async createSound(type) {
        // Create procedural sounds based on type
        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.1;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        switch (type) {
            case 'move':
            case 'rotate':
                // Quick chirp
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 10);
                }
                break;
                
            case 'lock':
            case 'hardDrop':
                // Thud
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20);
                }
                break;
                
            case 'lineClear':
            case 'tetris':
                // Rising sweep
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 200 + t * 2000;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5);
                }
                break;
                
            default:
                // Default beep
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 5);
                }
        }
        
        return buffer;
    }
    
    createProceduralSounds() {
        // Additional setup for complex sounds
    }
    
    playSound(name) {
        if (!this.enabled || !this.sounds[name]) return;
        
        try {
            const sound = this.sounds[name];
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = sound.buffer;
            gainNode.gain.value = sound.volume;
            
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            source.start();
        } catch (error) {
            console.warn('Failed to play sound:', name, error);
        }
    }
    
    playMenuMusic() {
        if (!this.enabled) return;
        
        // Stop current BGM
        this.stopBGM();
        
        // Create oscillator-based menu music
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.frequency.value = 220;
        oscillator.type = 'sine';
        
        gainNode.gain.value = 0.1;
        
        oscillator.connect(gainNode);
        gainNode.connect(this.bgmGain);
        
        oscillator.start();
        
        this.bgm = { oscillator, gainNode };
        
        // Simple melody pattern
        this.playMelodyPattern();
    }
    
    playGameMusic() {
        if (!this.enabled) return;
        
        // Stop current BGM
        this.stopBGM();
        
        // Create more intense game music
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode1 = this.audioContext.createGain();
        const gainNode2 = this.audioContext.createGain();
        
        oscillator1.frequency.value = 110;
        oscillator1.type = 'square';
        oscillator2.frequency.value = 55;
        oscillator2.type = 'sawtooth';
        
        gainNode1.gain.value = 0.05;
        gainNode2.gain.value = 0.03;
        
        oscillator1.connect(gainNode1);
        oscillator2.connect(gainNode2);
        gainNode1.connect(this.bgmGain);
        gainNode2.connect(this.bgmGain);
        
        oscillator1.start();
        oscillator2.start();
        
        this.bgm = { 
            oscillators: [oscillator1, oscillator2],
            gainNodes: [gainNode1, gainNode2]
        };
    }
    
    playMelodyPattern() {
        if (!this.bgm || !this.bgm.oscillator) return;
        
        const notes = [220, 247, 262, 294, 330, 294, 262, 247];
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.bgm || !this.bgm.oscillator) return;
            
            this.bgm.oscillator.frequency.setValueAtTime(
                notes[noteIndex],
                this.audioContext.currentTime
            );
            
            noteIndex = (noteIndex + 1) % notes.length;
            
            setTimeout(playNote, 500);
        };
        
        playNote();
    }
    
    stopMenuMusic() {
        this.stopBGM();
    }
    
    stopGameMusic() {
        this.stopBGM();
    }
    
    stopBGM() {
        if (this.bgm) {
            if (this.bgm.oscillator) {
                this.bgm.oscillator.stop();
            }
            if (this.bgm.oscillators) {
                this.bgm.oscillators.forEach(osc => osc.stop());
            }
            this.bgm = null;
        }
    }
    
    setBGMVolume(volume) {
        this.bgmVolume = volume;
        if (this.bgmGain) {
            this.bgmGain.gain.value = volume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = volume;
        if (this.sfxGain) {
            this.sfxGain.gain.value = volume;
        }
    }
    
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = volume;
        }
    }
    
    mute() {
        this.setMasterVolume(0);
    }
    
    unmute() {
        this.setMasterVolume(1);
    }
}