# Tetris Ultimate マルチプレイヤーガイド

## 現在の実装状況

現在、マルチプレイヤー機能は**シミュレーションモード**で動作しています。これは開発・テスト用の実装で、実際のネットワーク通信は行いません。

### 実装済みの機能

1. **NetworkManager** - ネットワーク通信のインターフェース
2. **ルーム管理** - ルームの作成・参加・退出
3. **プレイヤー同期** - ゲーム状態の送受信
4. **攻撃システム** - ライン送信による攻撃
5. **マッチメイキング** - 対戦相手の検索（シミュレーション）

## 実際のマルチプレイヤー実装に必要なコンポーネント

### 1. WebSocketサーバー（Node.js + Socket.io）

```javascript
// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ルーム管理
const rooms = new Map();
const players = new Map();

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);
  
  socket.on('createRoom', (options) => {
    const roomId = generateRoomId();
    const room = {
      id: roomId,
      host: socket.id,
      players: [socket.id],
      settings: options,
      gameState: 'waiting',
      seed: Math.random()
    };
    
    rooms.set(roomId, room);
    players.set(socket.id, { roomId, ready: false });
    
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, room });
  });
  
  socket.on('joinRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 4) {
      room.players.push(socket.id);
      players.set(socket.id, { roomId, ready: false });
      
      socket.join(roomId);
      socket.emit('roomJoined', { roomId, room });
      io.to(roomId).emit('playerJoined', { playerId: socket.id });
    } else {
      socket.emit('error', { message: 'Room not found or full' });
    }
  });
  
  socket.on('gameUpdate', (data) => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      socket.to(player.roomId).emit('playerUpdate', {
        playerId: socket.id,
        data
      });
    }
  });
  
  socket.on('sendAttack', (attack) => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      socket.to(attack.targetId).emit('receiveAttack', {
        from: socket.id,
        lines: attack.lines,
        type: attack.type
      });
    }
  });
  
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(id => id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(player.roomId);
        } else {
          io.to(player.roomId).emit('playerLeft', { playerId: socket.id });
        }
      }
    }
    players.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}
```

### 2. 改良版NetworkManager

```javascript
// src/network/RealNetworkManager.js
import io from 'socket.io-client';

export class RealNetworkManager {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.playerId = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5
      });
      
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.playerId = this.socket.id;
        this.emit('connected', { playerId: this.playerId });
        resolve();
      });
      
      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.emit('disconnected', { reason });
      });
      
      this.socket.on('error', (error) => {
        this.emit('error', { error });
        reject(error);
      });
      
      // ゲームイベントのリスナー設定
      this.setupGameListeners();
    });
  }
  
  setupGameListeners() {
    this.socket.on('roomCreated', (data) => {
      this.roomId = data.roomId;
      this.emit('roomCreated', data);
    });
    
    this.socket.on('roomJoined', (data) => {
      this.roomId = data.roomId;
      this.emit('roomJoined', data);
    });
    
    this.socket.on('playerJoined', (data) => {
      this.emit('playerJoined', data);
    });
    
    this.socket.on('playerLeft', (data) => {
      this.emit('playerLeft', data);
    });
    
    this.socket.on('gameStarted', (data) => {
      this.emit('gameStarted', data);
    });
    
    this.socket.on('playerUpdate', (data) => {
      this.emit('playerUpdate', data);
    });
    
    this.socket.on('receiveAttack', (data) => {
      this.emit('attackReceived', data);
    });
    
    this.socket.on('gameOver', (data) => {
      this.emit('gameOver', data);
    });
  }
  
  createRoom(options = {}) {
    this.socket.emit('createRoom', options);
  }
  
  joinRoom(roomId) {
    this.socket.emit('joinRoom', roomId);
  }
  
  // ... 他のメソッドも同様に実装
}
```

### 3. マルチプレイヤーゲームモード

```javascript
// src/game/MultiplayerGame.js
export class MultiplayerGame extends Game {
  constructor(options) {
    super(options);
    this.networkManager = options.networkManager;
    this.opponents = new Map();
    this.pendingAttacks = [];
    
    this.setupNetworkHandlers();
  }
  
  setupNetworkHandlers() {
    this.networkManager.on('playerUpdate', (data) => {
      this.updateOpponent(data.playerId, data.data);
    });
    
    this.networkManager.on('attackReceived', (attack) => {
      this.pendingAttacks.push(attack);
    });
    
    this.networkManager.on('gameOver', (data) => {
      this.handleOpponentGameOver(data.playerId);
    });
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // ネットワーク更新の送信（レート制限付き）
    this.networkUpdateTimer += deltaTime;
    if (this.networkUpdateTimer >= 50) { // 20Hz
      this.sendNetworkUpdate();
      this.networkUpdateTimer = 0;
    }
    
    // 受信した攻撃の処理
    this.processPendingAttacks();
  }
  
  sendNetworkUpdate() {
    const updateData = {
      board: this.board.getCompressedState(),
      score: this.stats.score,
      level: this.stats.level,
      lines: this.stats.lines,
      combo: this.stats.combo,
      currentPiece: this.currentPiece ? {
        type: this.currentPiece.type,
        x: this.currentPiece.x,
        y: this.currentPiece.y,
        rotation: this.currentPiece.rotation
      } : null
    };
    
    this.networkManager.sendGameUpdate(updateData);
  }
  
  handleLineClears(lines) {
    super.handleLineClears(lines);
    
    // 攻撃ラインの計算と送信
    const attackLines = this.calculateAttackLines(lines);
    if (attackLines > 0) {
      const target = this.selectAttackTarget();
      if (target) {
        this.networkManager.sendAttack(target, attackLines, 'normal');
      }
    }
  }
  
  processPendingAttacks() {
    while (this.pendingAttacks.length > 0) {
      const attack = this.pendingAttacks.shift();
      this.receiveGarbage(attack.lines);
    }
  }
}
```

### 4. マルチプレイヤーUI

```javascript
// src/ui/MultiplayerUI.js
export class MultiplayerUI {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'multiplayer-ui';
  }
  
  createLobby() {
    return `
      <div class="multiplayer-lobby">
        <h2>マルチプレイヤーロビー</h2>
        
        <div class="lobby-options">
          <button class="create-room-btn">ルームを作成</button>
          <div class="join-room">
            <input type="text" placeholder="ルームコード" class="room-code-input">
            <button class="join-room-btn">参加</button>
          </div>
          <button class="quick-match-btn">クイックマッチ</button>
        </div>
        
        <div class="room-info hidden">
          <h3>ルーム: <span class="room-id"></span></h3>
          <div class="players-list"></div>
          <button class="start-game-btn">ゲーム開始</button>
          <button class="leave-room-btn">退出</button>
        </div>
      </div>
    `;
  }
  
  createGameView() {
    return `
      <div class="multiplayer-game">
        <div class="opponents-area">
          <!-- 対戦相手のミニボード -->
        </div>
        
        <div class="main-game-area">
          <!-- 自分のゲーム画面 -->
        </div>
        
        <div class="attack-indicators">
          <div class="incoming-attacks"></div>
          <div class="outgoing-attacks"></div>
        </div>
        
        <div class="chat-area">
          <div class="chat-messages"></div>
          <input type="text" class="chat-input" placeholder="メッセージを入力...">
        </div>
      </div>
    `;
  }
}
```

## セットアップ手順

### 1. サーバーのセットアップ

```bash
# サーバーディレクトリの作成
mkdir tetris-server
cd tetris-server

# 依存関係のインストール
npm init -y
npm install express socket.io cors dotenv

# サーバーの起動
node server/index.js
```

### 2. クライアントの設定

```javascript
// .env
REACT_APP_SERVER_URL=http://localhost:3001
```

### 3. package.jsonの更新

```json
{
  "dependencies": {
    "socket.io-client": "^4.5.0"
  }
}
```

## セキュリティ考慮事項

1. **入力検証** - すべてのクライアント入力をサーバー側で検証
2. **レート制限** - 過度な要求を防ぐ
3. **認証** - JWTトークンによるユーザー認証
4. **暗号化** - WSS（WebSocket Secure）の使用
5. **チート対策** - サーバー側でのゲームロジック検証

## パフォーマンス最適化

1. **状態圧縮** - ボード状態の効率的な圧縮
2. **差分更新** - 変更部分のみの送信
3. **予測処理** - クライアント側予測
4. **補間** - スムーズな表示のための補間処理
5. **バッファリング** - ネットワーク遅延の吸収

## 今後の拡張案

1. **ランクマッチ** - ELOレーティングシステム
2. **観戦モード** - リアルタイム観戦機能
3. **リプレイ** - 対戦の録画・再生
4. **トーナメント** - 大会機能
5. **フレンドシステム** - フレンドリスト・招待機能