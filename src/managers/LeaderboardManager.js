export class LeaderboardManager {
    constructor() {
        this.storageKey = 'tetris-ultimate-leaderboard';
        this.maxEntries = 100;
        this.leaderboards = {
            global: [],
            daily: [],
            weekly: [],
            monthly: []
        };
        
        this.load();
    }
    
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.leaderboards = JSON.parse(saved);
            } else {
                this.generateDemoData();
            }
        } catch (error) {
            console.warn('Failed to load leaderboard:', error);
            this.generateDemoData();
        }
    }
    
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.leaderboards));
        } catch (error) {
            console.warn('Failed to save leaderboard:', error);
        }
    }
    
    generateDemoData() {
        const names = [
            'TetrisMaster', 'BlockBuster', 'LineClearer', 'T-Spinner',
            'ComboKing', 'SpeedDemon', 'PerfectPlayer', 'ProGamer',
            'Rookie', 'Veteran', 'Legend', 'Champion'
        ];
        
        const modes = ['single', 'multiplayer', 'ai-battle', 'training'];
        
        // Generate random scores
        for (let i = 0; i < 50; i++) {
            const entry = {
                id: this.generateId(),
                name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000),
                score: Math.floor(Math.random() * 1000000) + 10000,
                level: Math.floor(Math.random() * 50) + 1,
                lines: Math.floor(Math.random() * 500) + 50,
                mode: modes[Math.floor(Math.random() * modes.length)],
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                ppm: Math.random() * 100 + 20,
                apm: Math.random() * 150 + 30,
                time: Math.floor(Math.random() * 600) + 60,
                avatar: 'assets/avatar-default.png'
            };
            
            this.addToLeaderboards(entry);
        }
        
        this.save();
    }
    
    submitScore(scoreData) {
        const entry = {
            id: this.generateId(),
            name: scoreData.name || 'Anonymous',
            score: scoreData.score,
            level: scoreData.level,
            lines: scoreData.lines,
            mode: scoreData.mode,
            date: new Date().toISOString(),
            ppm: scoreData.ppm || 0,
            apm: scoreData.apm || 0,
            time: scoreData.time || 0,
            avatar: scoreData.avatar || 'default'
        };
        
        const rank = this.addToLeaderboards(entry);
        this.save();
        
        return rank;
    }
    
    addToLeaderboards(entry) {
        // Add to global leaderboard
        this.leaderboards.global.push(entry);
        this.leaderboards.global.sort((a, b) => b.score - a.score);
        if (this.leaderboards.global.length > this.maxEntries) {
            this.leaderboards.global = this.leaderboards.global.slice(0, this.maxEntries);
        }
        
        // Add to time-based leaderboards
        const now = new Date();
        const entryDate = new Date(entry.date);
        
        // Daily
        if (this.isSameDay(now, entryDate)) {
            this.leaderboards.daily.push(entry);
            this.leaderboards.daily.sort((a, b) => b.score - a.score);
            if (this.leaderboards.daily.length > this.maxEntries) {
                this.leaderboards.daily = this.leaderboards.daily.slice(0, this.maxEntries);
            }
        }
        
        // Weekly
        if (this.isSameWeek(now, entryDate)) {
            this.leaderboards.weekly.push(entry);
            this.leaderboards.weekly.sort((a, b) => b.score - a.score);
            if (this.leaderboards.weekly.length > this.maxEntries) {
                this.leaderboards.weekly = this.leaderboards.weekly.slice(0, this.maxEntries);
            }
        }
        
        // Monthly
        if (this.isSameMonth(now, entryDate)) {
            this.leaderboards.monthly.push(entry);
            this.leaderboards.monthly.sort((a, b) => b.score - a.score);
            if (this.leaderboards.monthly.length > this.maxEntries) {
                this.leaderboards.monthly = this.leaderboards.monthly.slice(0, this.maxEntries);
            }
        }
        
        // Return global rank
        return this.leaderboards.global.findIndex(e => e.id === entry.id) + 1;
    }
    
    getLeaderboard(type = 'global', mode = null, limit = 10) {
        let leaderboard = this.leaderboards[type] || this.leaderboards.global;
        
        // Filter by mode if specified
        if (mode) {
            leaderboard = leaderboard.filter(entry => entry.mode === mode);
        }
        
        // Clean expired entries for time-based leaderboards
        if (type !== 'global') {
            this.cleanExpiredEntries(type);
        }
        
        return leaderboard.slice(0, limit);
    }
    
    getRank(score, type = 'global') {
        const leaderboard = this.leaderboards[type] || this.leaderboards.global;
        const index = leaderboard.findIndex(entry => entry.score < score);
        return index === -1 ? leaderboard.length + 1 : index + 1;
    }
    
    getPersonalBest(playerName) {
        const entries = this.leaderboards.global.filter(entry => entry.name === playerName);
        return entries.length > 0 ? entries[0] : null;
    }
    
    getStats() {
        const stats = {
            totalGames: this.leaderboards.global.length,
            averageScore: 0,
            averageLevel: 0,
            averageLines: 0,
            topScore: 0,
            topPlayer: null
        };
        
        if (stats.totalGames > 0) {
            const totals = this.leaderboards.global.reduce((acc, entry) => {
                acc.score += entry.score;
                acc.level += entry.level;
                acc.lines += entry.lines;
                return acc;
            }, { score: 0, level: 0, lines: 0 });
            
            stats.averageScore = Math.floor(totals.score / stats.totalGames);
            stats.averageLevel = Math.floor(totals.level / stats.totalGames);
            stats.averageLines = Math.floor(totals.lines / stats.totalGames);
            stats.topScore = this.leaderboards.global[0].score;
            stats.topPlayer = this.leaderboards.global[0].name;
        }
        
        return stats;
    }
    
    cleanExpiredEntries(type) {
        const now = new Date();
        let cutoffDate;
        
        switch (type) {
            case 'daily':
                cutoffDate = new Date(now);
                cutoffDate.setDate(cutoffDate.getDate() - 1);
                break;
            case 'weekly':
                cutoffDate = new Date(now);
                cutoffDate.setDate(cutoffDate.getDate() - 7);
                break;
            case 'monthly':
                cutoffDate = new Date(now);
                cutoffDate.setMonth(cutoffDate.getMonth() - 1);
                break;
            default:
                return;
        }
        
        this.leaderboards[type] = this.leaderboards[type].filter(
            entry => new Date(entry.date) > cutoffDate
        );
    }
    
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    isSameWeek(date1, date2) {
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return Math.abs(date1 - date2) < oneWeek;
    }
    
    isSameMonth(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth();
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    clear() {
        this.leaderboards = {
            global: [],
            daily: [],
            weekly: [],
            monthly: []
        };
        this.save();
    }
    
    export() {
        return JSON.stringify(this.leaderboards, null, 2);
    }
    
    import(data) {
        try {
            const imported = JSON.parse(data);
            this.leaderboards = imported;
            this.save();
            return true;
        } catch (error) {
            console.error('Failed to import leaderboard:', error);
            return false;
        }
    }
}