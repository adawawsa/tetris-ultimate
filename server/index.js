const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// データ構造
const rooms = new Map();
const players = new Map();

// ルーム管理クラス
class Room {
    constructor(id, host, settings = {}) {
        this.id = id;
        this.host = host;
        this.players = new Map();
        this.settings = {
            maxPlayers: settings.maxPlayers || 4,
            gameMode: settings.gameMode || 'versus',
            startLevel: settings.startLevel || 1,
            ...settings
        };
        this.state = 'waiting'; // waiting, starting, playing, finished
        this.seed = Math.random();
        this.startTime = null;
    }

    addPlayer(id, playerData) {
        if (this.players.size >= this.settings.maxPlayers) {
            return false;
        }
        this.players.set(id, {
            id,
            name: playerData.name || `Player ${this.players.size + 1}`,
            ready: false,
            alive: true,
            stats: {
                score: 0,
                lines: 0,
                level: this.settings.startLevel,
                attacks: 0,
                defends: 0
            }
        });
        return true;
    }

    removePlayer(id) {
        this.players.delete(id);
        if (id === this.host && this.players.size > 0) {
            this.host = this.players.keys().next().value;
        }
    }

    setPlayerReady(id, ready) {
        const player = this.players.get(id);
        if (player) {
            player.ready = ready;
        }
    }

    allPlayersReady() {
        if (this.players.size < 2) return false;
        for (const player of this.players.values()) {
            if (!player.ready) return false;
        }
        return true;
    }

    canStart() {
        return this.state === 'waiting' && this.allPlayersReady();
    }

    start() {
        this.state = 'playing';
        this.startTime = Date.now();
    }

    updatePlayerStats(playerId, stats) {
        const player = this.players.get(playerId);
        if (player) {
            player.stats = { ...player.stats, ...stats };
        }
    }

    setPlayerAlive(playerId, alive) {
        const player = this.players.get(playerId);
        if (player) {
            player.alive = alive;
        }
        this.checkGameEnd();
    }

    checkGameEnd() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        if (alivePlayers.length <= 1 && this.state === 'playing') {
            this.state = 'finished';
            return alivePlayers[0] || null;
        }
        return null;
    }

    getPublicData() {
        return {
            id: this.id,
            host: this.host,
            players: Array.from(this.players.values()),
            settings: this.settings,
            state: this.state,
            playerCount: this.players.size
        };
    }
}

// Socket.IO イベントハンドラー
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // プレイヤー情報の初期化
    players.set(socket.id, {
        id: socket.id,
        roomId: null,
        name: null
    });

    // プレイヤー名の設定
    socket.on('setName', (name) => {
        const player = players.get(socket.id);
        if (player) {
            player.name = name;
        }
    });

    // ルーム作成
    socket.on('createRoom', (settings) => {
        const roomId = generateRoomId();
        const room = new Room(roomId, socket.id, settings);
        room.addPlayer(socket.id, players.get(socket.id));
        
        rooms.set(roomId, room);
        players.get(socket.id).roomId = roomId;
        
        socket.join(roomId);
        socket.emit('roomCreated', {
            roomId,
            room: room.getPublicData()
        });
        
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // ルーム参加
    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        const player = players.get(socket.id);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        if (room.state !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }
        
        if (room.addPlayer(socket.id, player)) {
            player.roomId = roomId;
            socket.join(roomId);
            
            io.to(roomId).emit('playerJoined', {
                player: room.players.get(socket.id),
                room: room.getPublicData()
            });
            
            socket.emit('roomJoined', {
                roomId,
                room: room.getPublicData()
            });
            
            console.log(`Player ${socket.id} joined room ${roomId}`);
        } else {
            socket.emit('error', { message: 'Room is full' });
        }
    });

    // ルーム退出
    socket.on('leaveRoom', () => {
        handlePlayerLeave(socket);
    });

    // 準備状態の切り替え
    socket.on('toggleReady', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;
        
        const room = rooms.get(player.roomId);
        if (!room || room.state !== 'waiting') return;
        
        const playerData = room.players.get(socket.id);
        room.setPlayerReady(socket.id, !playerData.ready);
        
        io.to(player.roomId).emit('playerReady', {
            playerId: socket.id,
            ready: playerData.ready,
            room: room.getPublicData()
        });
    });

    // ゲーム開始
    socket.on('startGame', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;
        
        const room = rooms.get(player.roomId);
        if (!room || room.host !== socket.id) {
            socket.emit('error', { message: 'Only host can start the game' });
            return;
        }
        
        if (!room.canStart()) {
            socket.emit('error', { message: 'Not all players are ready' });
            return;
        }
        
        room.start();
        io.to(player.roomId).emit('gameStarted', {
            seed: room.seed,
            startTime: room.startTime,
            room: room.getPublicData()
        });
        
        console.log(`Game started in room ${player.roomId}`);
    });

    // ゲーム更新
    socket.on('gameUpdate', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;
        
        const room = rooms.get(player.roomId);
        if (!room || room.state !== 'playing') return;
        
        // プレイヤーの統計を更新
        room.updatePlayerStats(socket.id, data.stats);
        
        // 他のプレイヤーに送信
        socket.to(player.roomId).emit('playerUpdate', {
            playerId: socket.id,
            board: data.board,
            stats: data.stats,
            currentPiece: data.currentPiece,
            nextPieces: data.nextPieces,
            holdPiece: data.holdPiece
        });
    });

    // 攻撃送信
    socket.on('sendAttack', (attack) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;
        
        const room = rooms.get(player.roomId);
        if (!room || room.state !== 'playing') return;
        
        // 攻撃統計を更新
        const attacker = room.players.get(socket.id);
        if (attacker) {
            attacker.stats.attacks += attack.lines;
        }
        
        // ターゲット選択ロジック
        let targetId = attack.targetId;
        if (!targetId || targetId === 'random') {
            const alivePlayers = Array.from(room.players.values())
                .filter(p => p.id !== socket.id && p.alive);
            if (alivePlayers.length > 0) {
                targetId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
            }
        }
        
        if (targetId) {
            io.to(targetId).emit('receiveAttack', {
                from: socket.id,
                lines: attack.lines,
                type: attack.type || 'normal'
            });
            
            // 防御統計を更新
            const defender = room.players.get(targetId);
            if (defender) {
                defender.stats.defends += attack.lines;
            }
        }
    });

    // ゲームオーバー
    socket.on('gameOver', () => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;
        
        const room = rooms.get(player.roomId);
        if (!room || room.state !== 'playing') return;
        
        room.setPlayerAlive(socket.id, false);
        
        io.to(player.roomId).emit('playerGameOver', {
            playerId: socket.id
        });
        
        const winner = room.checkGameEnd();
        if (winner) {
            io.to(player.roomId).emit('gameFinished', {
                winner: winner,
                room: room.getPublicData()
            });
            console.log(`Game finished in room ${player.roomId}, winner: ${winner.name}`);
        }
    });

    // チャットメッセージ
    socket.on('sendChat', (message) => {
        const player = players.get(socket.id);
        if (!player || !player.roomId) return;
        
        io.to(player.roomId).emit('chatMessage', {
            playerId: socket.id,
            playerName: player.name || 'Anonymous',
            message: message,
            timestamp: Date.now()
        });
    });

    // 切断処理
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        handlePlayerLeave(socket);
        players.delete(socket.id);
    });
});

// ヘルパー関数
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
}

function handlePlayerLeave(socket) {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    room.removePlayer(socket.id);
    socket.leave(player.roomId);
    player.roomId = null;
    
    if (room.players.size === 0) {
        rooms.delete(room.id);
        console.log(`Room ${room.id} deleted (empty)`);
    } else {
        io.to(room.id).emit('playerLeft', {
            playerId: socket.id,
            room: room.getPublicData()
        });
        
        if (room.state === 'playing') {
            room.setPlayerAlive(socket.id, false);
            const winner = room.checkGameEnd();
            if (winner) {
                io.to(room.id).emit('gameFinished', {
                    winner: winner,
                    room: room.getPublicData()
                });
            }
        }
    }
}

// HTTPエンドポイント
app.get('/health', (req, res) => {
    res.json({ status: 'ok', rooms: rooms.size, players: players.size });
});

app.get('/rooms', (req, res) => {
    const publicRooms = Array.from(rooms.values())
        .filter(room => room.state === 'waiting' && !room.settings.private)
        .map(room => room.getPublicData());
    res.json(publicRooms);
});

// サーバー起動
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Tetris Ultimate Server running on port ${PORT}`);
});