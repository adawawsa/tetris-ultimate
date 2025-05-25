import { Game } from './Game.js';
import { AI } from '../ai/AI.js';

export class TrainingGame extends Game {
    constructor(options) {
        super({ ...options, mode: 'training' });
        
        // トレーニング専用機能
        this.trainingMode = 'freeplay'; // freeplay, drills, analysis, challenge
        this.isPaused = false;
        this.hints = true;
        this.showGhostAlways = true;
        this.undoHistory = [];
        this.maxUndoSteps = 20;
        
        // 練習項目
        this.drills = {
            tspins: { enabled: false, count: 0, target: 10 },
            tetrises: { enabled: false, count: 0, target: 20 },
            perfectClears: { enabled: false, count: 0, target: 5 },
            openers: { enabled: false, current: null },
            finesse: { enabled: false, mistakes: 0 }
        };
        
        // AI アシスタント
        this.aiAssistant = new AI(this);
        this.aiAssistant.setDifficulty('impossible'); // 最適な手を計算
        
        // 統計詳細
        this.detailedStats = {
            piecesPerMinute: 0,
            attackPerMinute: 0,
            efficiency: 0,
            finesseErrors: 0,
            missedTSpins: 0,
            wastedIpieces: 0,
            averageHeight: 0,
            keyPresses: 0,
            undoCount: 0
        };
        
        this.setupTrainingUI();
    }
    
    setupTrainingUI() {
        // トレーニング用のUIを作成
        const trainingPanel = document.createElement('div');
        trainingPanel.className = 'training-panel';
        trainingPanel.innerHTML = `
            <div class="training-header">
                <h3>トレーニングモード</h3>
                <select class="training-mode-select">
                    <option value="freeplay">フリープレイ</option>
                    <option value="drills">ドリル練習</option>
                    <option value="analysis">動作分析</option>
                    <option value="challenge">チャレンジ</option>
                </select>
            </div>
            
            <div class="training-controls">
                <button class="training-btn" data-action="undo">元に戻す (Z)</button>
                <button class="training-btn" data-action="restart">リスタート (R)</button>
                <button class="training-btn" data-action="hint">ヒント表示 (H)</button>
                <button class="training-btn" data-action="analyze">分析 (A)</button>
            </div>
            
            <div class="training-drills hidden">
                <h4>練習項目</h4>
                <label><input type="checkbox" data-drill="tspins"> T-Spin練習</label>
                <label><input type="checkbox" data-drill="tetrises"> テトリス練習</label>
                <label><input type="checkbox" data-drill="perfectClears"> パーフェクトクリア</label>
                <label><input type="checkbox" data-drill="openers"> オープナー練習</label>
                <label><input type="checkbox" data-drill="finesse"> フィネス練習</label>
            </div>
            
            <div class="training-stats">
                <h4>詳細統計</h4>
                <div class="stat-row">
                    <span>PPM (Pieces/Min):</span>
                    <span id="training-ppm">0</span>
                </div>
                <div class="stat-row">
                    <span>APM (Attack/Min):</span>
                    <span id="training-apm">0</span>
                </div>
                <div class="stat-row">
                    <span>効率性:</span>
                    <span id="training-efficiency">0%</span>
                </div>
                <div class="stat-row">
                    <span>フィネスエラー:</span>
                    <span id="training-finesse">0</span>
                </div>
                <div class="stat-row">
                    <span>平均高さ:</span>
                    <span id="training-height">0</span>
                </div>
            </div>
            
            <div class="training-hints hidden">
                <h4>推奨される手</h4>
                <div class="hint-display"></div>
            </div>
        `;
        
        // UIをゲームコンテナに追加
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(trainingPanel);
        }
        
        this.setupTrainingEventListeners();
    }
    
    setupTrainingEventListeners() {
        // モード切替
        const modeSelect = document.querySelector('.training-mode-select');
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                this.switchTrainingMode(e.target.value);
            });
        }
        
        // トレーニングボタン
        document.querySelectorAll('.training-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleTrainingAction(action);
            });
        });
        
        // ドリルチェックボックス
        document.querySelectorAll('[data-drill]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const drill = e.target.dataset.drill;
                this.drills[drill].enabled = e.target.checked;
                if (e.target.checked) {
                    this.startDrill(drill);
                }
            });
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (this.mode !== 'training') return;
            
            switch(e.key.toLowerCase()) {
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        this.undo();
                    }
                    break;
                case 'r':
                    this.restart();
                    break;
                case 'h':
                    this.toggleHints();
                    break;
                case 'a':
                    this.analyzePosition();
                    break;
            }
        });
    }
    
    switchTrainingMode(mode) {
        this.trainingMode = mode;
        
        // UIの表示/非表示
        const drillsPanel = document.querySelector('.training-drills');
        const hintsPanel = document.querySelector('.training-hints');
        
        switch(mode) {
            case 'freeplay':
                drillsPanel?.classList.add('hidden');
                this.resetDrills();
                break;
                
            case 'drills':
                drillsPanel?.classList.remove('hidden');
                break;
                
            case 'analysis':
                hintsPanel?.classList.remove('hidden');
                this.hints = true;
                break;
                
            case 'challenge':
                this.startChallenge();
                break;
        }
    }
    
    handleTrainingAction(action) {
        switch(action) {
            case 'undo':
                this.undo();
                break;
            case 'restart':
                this.restart();
                break;
            case 'hint':
                this.toggleHints();
                break;
            case 'analyze':
                this.analyzePosition();
                break;
        }
    }
    
    // 元に戻す機能
    undo() {
        if (this.undoHistory.length === 0) return;
        
        const previousState = this.undoHistory.pop();
        this.board.grid = previousState.board;
        this.currentPiece = previousState.piece;
        this.stats = { ...previousState.stats };
        this.pieceQueue = previousState.queue;
        this.heldPiece = previousState.held;
        
        this.detailedStats.undoCount++;
        
        if (this.soundManager) {
            this.soundManager.playSound('move');
        }
    }
    
    // 状態を保存
    saveState() {
        if (this.undoHistory.length >= this.maxUndoSteps) {
            this.undoHistory.shift();
        }
        
        this.undoHistory.push({
            board: this.board.grid.map(row => [...row]),
            piece: this.currentPiece ? this.currentPiece.clone() : null,
            stats: { ...this.stats },
            queue: this.pieceQueue.clone(),
            held: this.heldPiece
        });
    }
    
    // ピース配置時のオーバーライド
    lockPiece() {
        this.saveState();
        
        // フィネスチェック
        if (this.drills.finesse.enabled) {
            this.checkFinesse();
        }
        
        // T-Spinチェック
        if (this.drills.tspins.enabled && this.currentPiece.type === 'T') {
            if (this.checkTSpin()) {
                this.drills.tspins.count++;
                this.showAchievement('T-Spin!');
            }
        }
        
        super.lockPiece();
        
        // 統計更新
        this.updateDetailedStats();
    }
    
    // ヒント表示
    toggleHints() {
        this.hints = !this.hints;
        const hintsPanel = document.querySelector('.training-hints');
        
        if (this.hints) {
            hintsPanel?.classList.remove('hidden');
            this.showHint();
        } else {
            hintsPanel?.classList.add('hidden');
        }
    }
    
    showHint() {
        if (!this.hints || !this.currentPiece) return;
        
        // AIに最適な配置を計算させる
        const bestMove = this.aiAssistant.calculateBestMove();
        if (!bestMove) return;
        
        const hintDisplay = document.querySelector('.hint-display');
        if (hintDisplay) {
            hintDisplay.innerHTML = `
                <div class="hint-move">
                    <p>推奨: X=${bestMove.x}, 回転=${bestMove.rotation}回</p>
                    <p>評価スコア: ${bestMove.score.toFixed(2)}</p>
                    ${bestMove.isTSpin ? '<p class="hint-special">T-Spin可能!</p>' : ''}
                    ${bestMove.clearsLines >= 4 ? '<p class="hint-special">テトリス可能!</p>' : ''}
                </div>
            `;
        }
    }
    
    // 位置分析
    analyzePosition() {
        const analysis = {
            holes: this.board.countHoles(),
            height: this.board.getMaxHeight(),
            bumpiness: this.board.getBumpiness(),
            clearableLines: this.board.getClearableLines(),
            tSpinSetups: this.findTSpinSetups(),
            efficiency: this.calculateEfficiency()
        };
        
        this.showAnalysis(analysis);
    }
    
    showAnalysis(analysis) {
        const modal = document.createElement('div');
        modal.className = 'analysis-modal';
        modal.innerHTML = `
            <div class="analysis-content">
                <h3>ポジション分析</h3>
                <div class="analysis-item ${analysis.holes > 2 ? 'warning' : 'good'}">
                    <span>穴の数:</span> ${analysis.holes}
                    ${analysis.holes > 2 ? '(多すぎます！)' : '(良好)'}
                </div>
                <div class="analysis-item ${analysis.height > 15 ? 'warning' : 'good'}">
                    <span>最大高さ:</span> ${analysis.height}
                    ${analysis.height > 15 ? '(危険！)' : '(安全)'}
                </div>
                <div class="analysis-item">
                    <span>凹凸:</span> ${analysis.bumpiness}
                </div>
                <div class="analysis-item">
                    <span>クリア可能ライン:</span> ${analysis.clearableLines.length}
                </div>
                <div class="analysis-item">
                    <span>T-Spinセットアップ:</span> ${analysis.tSpinSetups}
                </div>
                <div class="analysis-item">
                    <span>効率性:</span> ${(analysis.efficiency * 100).toFixed(1)}%
                </div>
                <button class="close-analysis">閉じる</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-analysis').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // ドリル練習
    startDrill(type) {
        switch(type) {
            case 'tspins':
                this.showMessage('T-Spin練習: T-Spinを10回決めよう！');
                // T-Spinしやすい地形を生成
                this.generateTSpinSetup();
                break;
                
            case 'tetrises':
                this.showMessage('テトリス練習: 4ライン消しを20回達成しよう！');
                // テトリスしやすい地形を生成
                this.generateTetrisSetup();
                break;
                
            case 'perfectClears':
                this.showMessage('パーフェクトクリア練習: 盤面を完全に空にしよう！');
                break;
                
            case 'openers':
                this.showOpenerMenu();
                break;
                
            case 'finesse':
                this.showMessage('フィネス練習: 最小の操作でピースを配置しよう！');
                this.detailedStats.finesseErrors = 0;
                break;
        }
    }
    
    // オープナー練習メニュー
    showOpenerMenu() {
        const openers = ['PCO', 'MKO', 'TKI', 'Trinity', 'Gamushiro'];
        const menu = document.createElement('div');
        menu.className = 'opener-menu';
        menu.innerHTML = `
            <h4>オープナーを選択</h4>
            ${openers.map(opener => `
                <button class="opener-btn" data-opener="${opener}">${opener}</button>
            `).join('')}
        `;
        
        document.body.appendChild(menu);
        
        menu.querySelectorAll('.opener-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.practiceOpener(e.target.dataset.opener);
                menu.remove();
            });
        });
    }
    
    // チャレンジモード
    startChallenge() {
        const challenges = [
            { name: '40ライン', type: 'sprint', target: 40 },
            { name: '2分間スコアアタック', type: 'score', duration: 120 },
            { name: 'サバイバル', type: 'survival', level: 15 },
            { name: 'チーズ', type: 'cheese', lines: 10 }
        ];
        
        // チャレンジ選択UI表示
        this.showChallengeMenu(challenges);
    }
    
    // 詳細統計の更新
    updateDetailedStats() {
        const gameTime = this.gameTime / 1000 / 60; // 分単位
        
        this.detailedStats.piecesPerMinute = gameTime > 0 ? 
            Math.floor(this.stats.pieces / gameTime) : 0;
            
        this.detailedStats.attackPerMinute = gameTime > 0 ?
            Math.floor(this.stats.attack / gameTime) : 0;
            
        this.detailedStats.efficiency = this.calculateEfficiency();
        this.detailedStats.averageHeight = this.board.getAverageHeight();
        
        // UI更新
        this.updateTrainingUI();
    }
    
    updateTrainingUI() {
        document.getElementById('training-ppm').textContent = this.detailedStats.piecesPerMinute;
        document.getElementById('training-apm').textContent = this.detailedStats.attackPerMinute;
        document.getElementById('training-efficiency').textContent = 
            (this.detailedStats.efficiency * 100).toFixed(1) + '%';
        document.getElementById('training-finesse').textContent = this.detailedStats.finesseErrors;
        document.getElementById('training-height').textContent = 
            this.detailedStats.averageHeight.toFixed(1);
    }
    
    // ヘルパーメソッド
    calculateEfficiency() {
        if (this.stats.pieces === 0) return 0;
        const idealKeys = this.stats.pieces * 3; // 理想的なキー数
        return Math.min(1, idealKeys / Math.max(this.detailedStats.keyPresses, 1));
    }
    
    checkFinesse() {
        // フィネスチェックロジック
        // 実際の操作数と理想的な操作数を比較
        const actualMoves = this.moveCounter;
        const idealMoves = this.calculateIdealMoves();
        
        if (actualMoves > idealMoves) {
            this.detailedStats.finesseErrors++;
            this.showMessage(`フィネスエラー: ${actualMoves - idealMoves}回余分な操作`);
        }
    }
    
    calculateIdealMoves() {
        // 理想的な操作数を計算（簡略版）
        return Math.abs(this.currentPiece.x - 4) + this.currentPiece.rotation;
    }
    
    findTSpinSetups() {
        // T-Spinのセットアップを検出
        let setups = 0;
        // 実装は省略（実際のT-Spin検出ロジック）
        return setups;
    }
    
    generateTSpinSetup() {
        // T-Spin練習用の地形生成
        // 実装は省略
    }
    
    generateTetrisSetup() {
        // テトリス練習用の地形生成（右端を空ける）
        for (let y = 15; y < 20; y++) {
            for (let x = 0; x < 9; x++) {
                this.board.grid[y][x] = Math.random() > 0.2 ? 7 : 0;
            }
            this.board.grid[y][9] = 0; // 右端を空ける
        }
    }
    
    showMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'training-message';
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => msgDiv.remove(), 3000);
    }
    
    showAchievement(text) {
        const achievement = document.createElement('div');
        achievement.className = 'training-achievement';
        achievement.textContent = text;
        document.body.appendChild(achievement);
        
        setTimeout(() => achievement.remove(), 2000);
    }
}