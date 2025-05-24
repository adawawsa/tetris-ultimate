export class NetworkManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.isConnected = false;
        this.listeners = new Map();
        
        // For demo purposes, we'll simulate network functionality
        this.simulatedLatency = 50;
        this.simulatedPlayers = new Map();
    }
    
    async connect(serverUrl = 'ws://localhost:3000') {
        return new Promise((resolve, reject) => {
            try {
                // In a real implementation, this would connect to a WebSocket server
                // For demo, we'll simulate the connection
                this.simulateConnection();
                
                setTimeout(() => {
                    this.isConnected = true;
                    this.playerId = this.generatePlayerId();
                    this.emit('connected', { playerId: this.playerId });
                    resolve();
                }, this.simulatedLatency);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    simulateConnection() {
        // Simulate WebSocket-like interface
        this.socket = {
            send: (data) => {
                const parsed = JSON.parse(data);
                this.handleSimulatedMessage(parsed);
            },
            close: () => {
                this.isConnected = false;
                this.emit('disconnected');
            }
        };
    }
    
    handleSimulatedMessage(message) {
        setTimeout(() => {
            switch (message.type) {
                case 'createRoom':
                    this.roomId = this.generateRoomId();
                    this.emit('roomCreated', { roomId: this.roomId });
                    break;
                    
                case 'joinRoom':
                    if (this.validateRoomId(message.roomId)) {
                        this.roomId = message.roomId;
                        this.emit('roomJoined', { 
                            roomId: this.roomId,
                            players: this.getSimulatedPlayers()
                        });
                    } else {
                        this.emit('error', { message: 'Invalid room ID' });
                    }
                    break;
                    
                case 'startGame':
                    this.emit('gameStarted', {
                        seed: Math.random(),
                        players: this.getSimulatedPlayers()
                    });
                    break;
                    
                case 'gameUpdate':
                    // Broadcast to other simulated players
                    this.broadcastToSimulatedPlayers(message.data);
                    break;
                    
                case 'sendAttack':
                    this.emit('attackReceived', {
                        from: message.from,
                        lines: message.lines,
                        type: message.attackType
                    });
                    break;
            }
        }, this.simulatedLatency);
    }
    
    createRoom(options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to server');
        }
        
        this.send({
            type: 'createRoom',
            options: {
                maxPlayers: options.maxPlayers || 4,
                gameMode: options.gameMode || 'versus',
                private: options.private || false
            }
        });
    }
    
    joinRoom(roomId) {
        if (!this.isConnected) {
            throw new Error('Not connected to server');
        }
        
        this.send({
            type: 'joinRoom',
            roomId: roomId
        });
    }
    
    leaveRoom() {
        if (this.roomId) {
            this.send({
                type: 'leaveRoom',
                roomId: this.roomId
            });
            this.roomId = null;
        }
    }
    
    startGame() {
        if (!this.roomId) {
            throw new Error('Not in a room');
        }
        
        this.send({
            type: 'startGame',
            roomId: this.roomId
        });
    }
    
    sendGameUpdate(data) {
        if (!this.roomId) return;
        
        this.send({
            type: 'gameUpdate',
            roomId: this.roomId,
            data: {
                playerId: this.playerId,
                board: data.board,
                score: data.score,
                level: data.level,
                lines: data.lines,
                combo: data.combo,
                attacking: data.attacking
            }
        });
    }
    
    sendAttack(targetId, lines, attackType) {
        if (!this.roomId) return;
        
        this.send({
            type: 'sendAttack',
            roomId: this.roomId,
            from: this.playerId,
            to: targetId,
            lines: lines,
            attackType: attackType
        });
    }
    
    sendChatMessage(message) {
        if (!this.roomId) return;
        
        this.send({
            type: 'chat',
            roomId: this.roomId,
            playerId: this.playerId,
            message: message,
            timestamp: Date.now()
        });
    }
    
    send(data) {
        if (this.socket && this.socket.send) {
            this.socket.send(JSON.stringify(data));
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
    
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.roomId = null;
        this.playerId = null;
    }
    
    // Simulation helpers
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    validateRoomId(roomId) {
        return /^[A-Z0-9]{6}$/.test(roomId);
    }
    
    getSimulatedPlayers() {
        // Add some AI players for testing
        if (this.simulatedPlayers.size === 0) {
            this.simulatedPlayers.set(this.playerId, {
                id: this.playerId,
                name: 'You',
                ready: true,
                stats: { score: 0, level: 1, lines: 0 }
            });
            
            // Add 1-3 AI players
            const aiCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < aiCount; i++) {
                const aiId = this.generatePlayerId();
                this.simulatedPlayers.set(aiId, {
                    id: aiId,
                    name: `AI Player ${i + 1}`,
                    ready: true,
                    stats: { score: 0, level: 1, lines: 0 },
                    isAI: true
                });
            }
        }
        
        return Array.from(this.simulatedPlayers.values());
    }
    
    broadcastToSimulatedPlayers(data) {
        // Simulate other players' updates
        this.simulatedPlayers.forEach((player, id) => {
            if (id !== this.playerId && player.isAI) {
                // Simulate AI player updates
                setTimeout(() => {
                    this.emit('playerUpdate', {
                        playerId: id,
                        data: {
                            score: Math.floor(Math.random() * 100000),
                            level: Math.floor(Math.random() * 20) + 1,
                            lines: Math.floor(Math.random() * 200),
                            board: this.generateSimulatedBoard()
                        }
                    });
                }, Math.random() * 1000);
            }
        });
    }
    
    generateSimulatedBoard() {
        // Generate a random board state for AI players
        const board = Array(20).fill(null).map(() => Array(10).fill(0));
        
        // Add some random blocks
        const filledRows = Math.floor(Math.random() * 10);
        for (let y = 20 - filledRows; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                if (Math.random() > 0.3) {
                    board[y][x] = Math.floor(Math.random() * 7) + 1;
                }
            }
        }
        
        return board;
    }
    
    // Matchmaking
    async findMatch(criteria = {}) {
        return new Promise((resolve) => {
            this.emit('searchingForMatch', { criteria });
            
            // Simulate finding a match
            setTimeout(() => {
                const matchData = {
                    roomId: this.generateRoomId(),
                    players: this.getSimulatedPlayers(),
                    mode: criteria.mode || 'versus',
                    ranked: criteria.ranked || false
                };
                
                this.roomId = matchData.roomId;
                this.emit('matchFound', matchData);
                resolve(matchData);
            }, Math.random() * 3000 + 2000);
        });
    }
    
    cancelMatchmaking() {
        this.emit('matchmakingCancelled');
    }
    
    // Statistics
    getNetworkStats() {
        return {
            ping: this.simulatedLatency,
            packetLoss: 0,
            jitter: Math.random() * 10,
            bandwidth: '100 Mbps',
            connected: this.isConnected,
            playerId: this.playerId,
            roomId: this.roomId
        };
    }
}