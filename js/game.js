/* ==========================================
   NEON TANK BUSTERS MAIN GAME ENGINE
   ========================================== */

// ==========================================
// 1. 全局背景粒子飘动效果
// ==========================================
const BgParticles = {
    canvas: null,
    ctx: null,
    list: [],
    init() {
        this.canvas = document.getElementById('bg-particles');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 创建初始粒子
        for (let i = 0; i < 45; i++) {
            this.list.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.2 - Math.random() * 0.5,
                size: 1 + Math.random() * 2,
                color: Math.random() < 0.5 ? '#00f0ff' : '#ff007f',
                alpha: 0.1 + Math.random() * 0.4
            });
        }
        this.loop();
    },
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#060814';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制星空电网背景纹路
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        this.ctx.lineWidth = 1;
        const spacing = 100;
        this.ctx.beginPath();
        for (let x = 0; x < this.canvas.width; x += spacing) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        for (let y = 0; y < this.canvas.height; y += spacing) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();

        // 绘制运动粒子
        for (const p of this.list) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) {
                p.y = this.canvas.height + 10;
                p.x = Math.random() * this.canvas.width;
            }
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        requestAnimationFrame(() => this.loop());
    }
};

// ==========================================
// 2. 核心游戏控制逻辑
// ==========================================
const Game = {
    canvas: null,
    ctx: null,
    gameRunning: false,
    gamePaused: false,
    
    // 关卡状态
    currentMode: 'campaign', // 'campaign' 或 'survival'
    currentLevelIndex: 0,
    score: 0,
    highScores: [],
    
    // 基地状态
    baseHealth: 5,
    baseMaxHealth: 5,
    baseRow: 19,
    baseCol: 9, // TILE_BASE = 9
    
    // 核心对象组
    player: null,
    enemies: [],
    bullets: [],
    powerUps: [],
    
    // 敌人刷怪限制 (战役模式)
    enemiesRemainingToSpawn: 0,
    totalEnemiesThisLevel: 10,
    activeEnemiesLimit: 4,
    spawnCooldown: 0,
    spawnLocations: [
        { x: 40, y: 40 },   // 左上
        { x: 380, y: 40 },  // 中上
        { x: 760, y: 40 }   // 右上
    ],

    // 无尽生存模式波次控制
    survivalWave: 1,
    survivalTimer: 0,

    // 道具配置
    powerUpTypes: ['shield', 'repair', 'star', 'grenade', 'clock'],
    
    // 道具状态
    freezeTimer: 0, // 时钟道具冻结敌人的帧数
    damageFlashTimer: 0, // 玩家受击红光警报闪烁计时器

    // 升级商店缓存数据
    shopCores: 0,
    upgrades: {
        speed: 1,
        damage: 1,
        fireRate: 1,
        shield: 1
    },
    upgradeCosts: {
        speed: [1, 1, 2, 2, 3],
        damage: [1, 2, 2, 3, 3],
        fireRate: [2, 2, 3, 3, 4],
        shield: [1, 1, 2, 2, 3]
    },

    // 控制设备输入状态
    keysPressed: {},
    mouseX: 400,
    mouseY: 400,
    isTestMode: false, // 标识当前是否在地图编辑器中启动的测试模式

    init() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.loadLeaderboard();
        this.bindEvents();
        this.renderLeaderboard();
    },

    // 绑定所有的 DOM 键鼠事件
    bindEvents() {
        // 键盘按下/弹起监听
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;
            
            // 暂停/继续切换
            if (e.key === 'Escape' && this.gameRunning) {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = false;
        });

        // 鼠标位置同步 (求出相对于 Canvas 的坐标)
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // 解决拉伸尺寸带来的比例转换
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

        // 鼠标点击射击
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.gameRunning && !this.gamePaused && this.player) {
                const newBullets = this.player.shoot();
                if (newBullets) {
                    this.bullets.push(...newBullets);
                }
            }
        });

        // 按钮事件绑定
        document.getElementById('btn-campaign').addEventListener('click', () => {
            SoundFX.playPowerUp();
            this.startCampaign();
        });

        document.getElementById('btn-survival').addEventListener('click', () => {
            SoundFX.playPowerUp();
            this.startSurvival();
        });

        document.getElementById('btn-editor').addEventListener('click', () => {
            SoundFX.playPowerUp();
            document.getElementById('screen-menu').classList.remove('active');
            document.getElementById('screen-editor').classList.add('active');
            LevelEditor.init();
        });

        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-quit').addEventListener('click', () => {
            if (confirm('确定要退出当前游戏并返回菜单吗？')) {
                this.endGame(false, true); // 返回主菜单
            }
        });

        // 浮层按钮
        document.getElementById('btn-overlay-action').addEventListener('click', () => {
            SoundFX.playPowerUp();
            document.getElementById('game-overlay').classList.add('hidden');
            if (this.isTestMode) {
                // 返回地图编辑器重新修改
                document.getElementById('screen-game').classList.remove('active');
                document.getElementById('screen-editor').classList.add('active');
                LevelEditor.startLoop();
            } else {
                if (this.currentMode === 'campaign') {
                    this.startCampaignLevel(this.currentLevelIndex);
                } else {
                    this.startSurvival();
                }
            }
        });

        document.getElementById('btn-overlay-menu').addEventListener('click', () => {
            document.getElementById('game-overlay').classList.add('hidden');
            document.getElementById('screen-game').classList.remove('active');
            document.getElementById('screen-menu').classList.add('active');
            this.endGame(false, true);
        });

        // 商店按钮
        document.getElementById('btn-shop-continue').addEventListener('click', () => {
            SoundFX.playPowerUp();
            document.getElementById('screen-shop').classList.remove('active');
            document.getElementById('screen-game').classList.add('active');
            // 前往下一关战役
            this.currentLevelIndex++;
            this.startCampaignLevel(this.currentLevelIndex);
        });

        // 商店升级卡牌点击
        const shopItems = document.querySelectorAll('.shop-item');
        shopItems.forEach(card => {
            const btn = card.querySelector('.btn-buy');
            btn.addEventListener('click', () => {
                const upgradeType = card.getAttribute('data-upgrade');
                this.purchaseUpgrade(upgradeType, card);
            });
        });
    },

    // 切换暂停状态
    togglePause() {
        if (!this.gameRunning) return;
        this.gamePaused = !this.gamePaused;

        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        const subtitle = document.getElementById('overlay-subtitle');
        const actionBtn = document.getElementById('btn-overlay-action');

        if (this.gamePaused) {
            title.textContent = 'SYSTEM PAUSED';
            title.style.color = '#00f0ff';
            title.style.textShadow = '0 0 15px rgba(0, 240, 255, 0.6)';
            subtitle.textContent = '系统已暂停，按 ESC 返回战场';
            actionBtn.querySelector('.btn-text').textContent = '继续战斗';
            
            // 解绑“再试一次”的原有事件，改写为“继续游戏”
            actionBtn.onclick = () => {
                this.togglePause();
            };

            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
            actionBtn.onclick = null; // 还原
        }
    },

    // ==========================================
    // 3. 游戏启动逻辑
    // ==========================================
    startCampaign() {
        this.currentMode = 'campaign';
        this.currentLevelIndex = 0;
        this.score = 0;
        this.isTestMode = false;
        
        // 重置升级数据
        this.upgrades = { speed: 1, damage: 1, fireRate: 1, shield: 1 };
        
        document.getElementById('screen-menu').classList.remove('active');
        document.getElementById('screen-game').classList.add('active');

        this.startCampaignLevel(0);
    },

    startCampaignLevel(levelIndex) {
        document.getElementById('hud-mode').textContent = '战役模式';
        
        const lvlNum = levelIndex + 1;
        const lvlStr = lvlNum < 10 ? '0' + lvlNum : lvlNum;
        if (levelIndex < 5) {
            document.getElementById('hud-level').textContent = `${lvlStr} / 05`;
        } else {
            document.getElementById('hud-level').textContent = `${lvlStr} / INF`;
        }
        
        // 加载地图
        GameMap.loadLevel(levelIndex);

        // 重置状态
        this.baseHealth = this.baseMaxHealth = 5;
        this.bullets = [];
        this.powerUps = [];
        this.enemies = [];
        this.keysPressed = {};
        this.freezeTimer = 0;
        ParticleSystem.clearAll();

        // 放置玩家在 Row 19, Col 6 (x: 260, y: 780)，确保生成格子清空防止卡死
        GameMap.currentGrid[19][6] = GameMap.TILE_EMPTY;
        
        // 清除所有坦克出生地格，防止卡死
        this.clearSpawnAreas();

        this.player = new PlayerTank(6 * GameMap.TILE_SIZE + 20, 19 * GameMap.TILE_SIZE + 20);
        // 挂载升级属性
        this.player.applyUpgrades(this.upgrades);

        // 设置本关敌人总数
        this.totalEnemiesThisLevel = 6 + levelIndex * 4; // 1级10个，2级14个...
        this.enemiesRemainingToSpawn = this.totalEnemiesThisLevel;
        this.spawnCooldown = 40; // 快速刷新第一只敌人
        
        // 动态提升场上敌军上限，后期关卡敌军潮涌极具压迫感
        this.activeEnemiesLimit = Math.min(8, 4 + Math.floor(levelIndex / 2));

        this.gameRunning = true;
        this.gamePaused = false;
        
        this.updateHUD();
        this.runGameLoop();
    },

    startSurvival() {
        this.currentMode = 'survival';
        this.score = 0;
        this.isTestMode = false;
        this.survivalWave = 1;
        this.survivalTimer = 0;
        this.upgrades = { speed: 1, damage: 1, fireRate: 1, shield: 1 };

        document.getElementById('screen-menu').classList.remove('active');
        document.getElementById('screen-game').classList.add('active');
        document.getElementById('hud-mode').textContent = '无尽生存';
        document.getElementById('hud-level').textContent = 'WAVE 01';

        // 生成随机地图
        GameMap.loadLevel(999); // 随机生成

        // 重置
        this.baseHealth = this.baseMaxHealth = 5;
        this.bullets = [];
        this.powerUps = [];
        this.enemies = [];
        this.keysPressed = {};
        this.freezeTimer = 0;
        ParticleSystem.clearAll();

        GameMap.currentGrid[19][6] = GameMap.TILE_EMPTY;
        
        // 清除所有坦克出生地格，防止卡死
        this.clearSpawnAreas();

        this.player = new PlayerTank(6 * GameMap.TILE_SIZE + 20, 19 * GameMap.TILE_SIZE + 20);
        this.player.applyUpgrades(this.upgrades);

        this.gameRunning = true;
        this.gamePaused = false;
        
        this.updateHUD();
        this.runGameLoop();
    },

    // 供地图编辑器点击“立即测试”启动的通道
    startCustomPlay(isTest) {
        this.currentMode = 'campaign';
        this.isTestMode = true;
        this.score = 0;

        document.getElementById('hud-mode').textContent = '自定义测试';
        document.getElementById('hud-level').textContent = 'TESTING';

        // 基地生命
        this.baseHealth = this.baseMaxHealth = 5;
        this.bullets = [];
        this.powerUps = [];
        this.enemies = [];
        this.keysPressed = {};
        this.freezeTimer = 0;
        ParticleSystem.clearAll();

        // 创建玩家与挂载临时升级，确保生成点不卡墙
        GameMap.currentGrid[19][6] = GameMap.TILE_EMPTY;
        
        // 清除所有坦克出生地格，防止卡死
        this.clearSpawnAreas();

        this.player = new PlayerTank(6 * GameMap.TILE_SIZE + 20, 19 * GameMap.TILE_SIZE + 20);
        this.player.applyUpgrades(this.upgrades);

        // 设置生成少量敌人用于测试
        this.totalEnemiesThisLevel = 8;
        this.enemiesRemainingToSpawn = this.totalEnemiesThisLevel;
        this.spawnCooldown = 50;

        this.gameRunning = true;
        this.gamePaused = false;
        
        this.updateHUD();
        this.runGameLoop();
    },

    // ==========================================
    // 4. 核心物理更新与游戏循环
    // ==========================================
    runGameLoop() {
        const loop = (timestamp) => {
            if (!this.gameRunning) return;

            if (!this.gamePaused) {
                this.update(timestamp);
            }
            this.draw(timestamp);

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    update(time) {
        // 1. 更新玩家坦克
        if (this.player && this.player.isAlive) {
            // 支持太空人般的太空滑行转向
            this.player.update(this.keysPressed, this.mouseX, this.mouseY, this.enemies);
            
            // 玩家死亡检测
            if (!this.player.isAlive) {
                this.endGame(false); // 失败
                return;
            }
        }

        // 2. 备弹状态同步
        if (this.keysPressed[' '] && this.player && this.player.isAlive) {
            // 空格键连射支持
            const bullets = this.player.shoot();
            if (bullets) this.bullets.push(...bullets);
        }

        // 3. 地图状态时序 (比如液体波动的定时器)
        // 4. 更新子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update();
            if (!b.isAlive) {
                this.bullets.splice(i, 1);
            }
        }

        // 5. 更新道具冷却
        if (this.freezeTimer > 0) this.freezeTimer--;

        // 6. 更新并生成敌人坦克
        this.handleEnemySpawning();

        const activeTanks = [...this.enemies];
        if (this.player && this.player.isAlive) activeTanks.push(this.player);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (this.freezeTimer > 0) {
                // 时钟暂停状态：敌人动作封印，但需要检测受伤
                if (!enemy.isAlive) {
                    this.score += enemy.scoreValue;
                    this.checkPowerUpDrop(enemy.x, enemy.y);
                    this.enemies.splice(i, 1);
                    this.checkLevelClearCondition();
                }
                continue;
            }

            const enemyBullets = enemy.update(this.player.x, this.player.y, this.baseRow, this.baseCol, activeTanks);
            if (enemyBullets) {
                this.bullets.push(...enemyBullets);
            }

            if (!enemy.isAlive) {
                this.score += enemy.scoreValue;
                // 有几率掉落能量模块/道具
                this.checkPowerUpDrop(enemy.x, enemy.y);
                this.enemies.splice(i, 1);
                
                // 更新 HUD
                this.updateHUD();
                
                // 战役胜利检测
                this.checkLevelClearCondition();
            }
        }

        // 7. 处理子弹 vs 坦克的碰撞
        this.resolveBulletTankCollisions();

        // 8. 玩家 vs 道具接触检测
        this.resolvePowerUpCollisions();

        // 9. 更新粒子系统
        ParticleSystem.update();

        // 10. 更新玩家受击红色屏幕闪烁时长
        if (this.damageFlashTimer > 0) this.damageFlashTimer--;

        // 11. 基地低生命值心跳警报音效 (血量 <= 2，每 90 帧播放低电平警告双音)
        if (this.baseHealth > 0 && this.baseHealth <= 2 && Math.floor(time) % 90 === 0) {
            if (typeof SoundFX !== 'undefined' && !SoundFX.muted && SoundFX.ctx) {
                const now = SoundFX.ctx.currentTime;
                const osc = SoundFX.ctx.createOscillator();
                const gain = SoundFX.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now); // A3
                osc.frequency.setValueAtTime(180, now + 0.15); // F3
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
                osc.connect(gain);
                gain.connect(SoundFX.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        }
    },

    // 处理敌方的不断出生派驻
    handleEnemySpawning() {
        if (this.currentMode === 'campaign') {
            // 还有敌人名额未刷新，且场上敌人未满上限
            if (this.enemiesRemainingToSpawn > 0 && this.enemies.length < this.activeEnemiesLimit) {
                this.spawnCooldown--;
                if (this.spawnCooldown <= 0) {
                    this.spawnEnemy();
                    // 刷怪CD根据关卡变小，后期刷怪越快，最低缩短至 50 帧
                    this.spawnCooldown = Math.max(50, 180 - this.currentLevelIndex * 20);
                }
            }
        } else {
            // 无尽模式：根据生存时长自动晋升波次
            this.survivalTimer++;
            
            // 每 1500 帧（约25秒）波次加1
            const nextWave = Math.floor(this.survivalTimer / 1500) + 1;
            if (nextWave !== this.survivalWave) {
                this.survivalWave = nextWave;
                document.getElementById('hud-level').textContent = `WAVE ${this.survivalWave < 10 ? '0' + this.survivalWave : this.survivalWave}`;
                SoundFX.playVictory();
                // 刷怪提示震屏
                ParticleSystem.triggerShake(6, 15);
            }

            // 无尽模式自动补兵
            const maxSurvivalEnemies = 3 + Math.floor(this.survivalWave * 0.7);
            if (this.enemies.length < Math.min(8, maxSurvivalEnemies)) {
                this.spawnCooldown--;
                if (this.spawnCooldown <= 0) {
                    this.spawnEnemy();
                    this.spawnCooldown = Math.max(70, 140 - this.survivalWave * 8);
                }
            }
        }
    },

    // 统一清除所有出生点范围内的阻挡块，防患于未然
    clearSpawnAreas() {
        // 1. 玩家出生点 Row 19, Col 6
        GameMap.currentGrid[19][6] = GameMap.TILE_EMPTY;
        
        // 2. 三个敌方出生地 (以每个 spot 为中心的 2x2 范围进行清空)
        for (const spot of this.spawnLocations) {
            const colStart = Math.floor((spot.x - 18) / GameMap.TILE_SIZE);
            const colEnd = Math.floor((spot.x + 18) / GameMap.TILE_SIZE);
            const rowStart = Math.floor((spot.y - 18) / GameMap.TILE_SIZE);
            const rowEnd = Math.floor((spot.y + 18) / GameMap.TILE_SIZE);
            
            for (let r = rowStart; r <= rowEnd; r++) {
                for (let c = colStart; c <= colEnd; c++) {
                    if (r >= 0 && r < GameMap.ROWS && c >= 0 && c < GameMap.COLS) {
                        GameMap.currentGrid[r][c] = GameMap.TILE_EMPTY;
                        delete GameMap.brickHealth[`${r},${c}`];
                    }
                }
            }
        }
    },

    // 生成敌方坦克
    spawnEnemy() {
        // 随机一个刷怪口
        const spot = this.spawnLocations[Math.floor(Math.random() * 3)];
        
        // 检查刷怪口是否被挡住 (避免坦克堆叠重合产生Bug)
        const activeTanks = [...this.enemies];
        if (this.player) activeTanks.push(this.player);
        
        const tempBounds = { x: spot.x - 17, y: spot.y - 17, width: 34, height: 34 };
        for (const tank of activeTanks) {
            if (tank.rectsOverlap(tempBounds, tank.getBounds())) {
                return; // 有车在出兵点，本次刷新推迟
            }
        }

        // 动态清空格子，防止由于地图设计漏洞或者自定义地图导致的卡出生点BUG
        const colStart = Math.floor((spot.x - 18) / GameMap.TILE_SIZE);
        const colEnd = Math.floor((spot.x + 18) / GameMap.TILE_SIZE);
        const rowStart = Math.floor((spot.y - 18) / GameMap.TILE_SIZE);
        const rowEnd = Math.floor((spot.y + 18) / GameMap.TILE_SIZE);
        for (let r = rowStart; r <= rowEnd; r++) {
            for (let c = colStart; c <= colEnd; c++) {
                if (r >= 0 && r < GameMap.ROWS && c >= 0 && c < GameMap.COLS) {
                    if (GameMap.currentGrid[r][c] !== GameMap.TILE_EMPTY) {
                        GameMap.currentGrid[r][c] = GameMap.TILE_EMPTY;
                        delete GameMap.brickHealth[`${r},${c}`];
                    }
                }
            }
        }

        // 决定敌人类型
        let type = 'normal';
        const rand = Math.random();

        if (this.currentMode === 'campaign') {
            const level = this.currentLevelIndex;
            if (level === 0) {
                type = rand < 0.25 ? 'scout' : 'normal';
            } else if (level === 1) {
                type = rand < 0.2 ? 'heavy' : (rand < 0.45 ? 'scout' : 'normal');
            } else if (level === 2) {
                type = rand < 0.35 ? 'heavy' : (rand < 0.6 ? 'scout' : 'normal');
            } else if (level === 3) {
                // 引入 Boss
                type = rand < 0.1 ? 'boss' : (rand < 0.4 ? 'heavy' : (rand < 0.7 ? 'scout' : 'normal'));
            } else {
                // 第5关：高产出 Boss 和重装
                type = rand < 0.25 ? 'boss' : (rand < 0.6 ? 'heavy' : (rand < 0.85 ? 'scout' : 'normal'));
            }
        } else {
            // 无尽模式根据波次加大难度
            const wave = this.survivalWave;
            if (wave < 2) {
                type = rand < 0.2 ? 'scout' : 'normal';
            } else if (wave < 4) {
                type = rand < 0.25 ? 'heavy' : (rand < 0.5 ? 'scout' : 'normal');
            } else if (wave < 6) {
                type = rand < 0.12 ? 'boss' : (rand < 0.4 ? 'heavy' : (rand < 0.7 ? 'scout' : 'normal'));
            } else {
                type = rand < 0.28 ? 'boss' : (rand < 0.65 ? 'heavy' : 'scout');
            }
        }

        const enemy = new EnemyTank(spot.x, spot.y, type);
        this.enemies.push(enemy);

        if (this.currentMode === 'campaign') {
            this.enemiesRemainingToSpawn--;
        }

        // 刷新口产生入场信标霓虹圈
        ParticleSystem.spawnExplosion(spot.x, spot.y, enemy.color, 12, 3);
    }
    ,

    // 处理子弹和坦克的物理损伤判定
    resolveBulletTankCollisions() {
        for (let bIndex = this.bullets.length - 1; bIndex >= 0; bIndex--) {
            const b = this.bullets[bIndex];
            if (!b.isAlive) continue;

            // 1. 如果是玩家子弹，判定是否命中敌军
            if (b.ownerType === 'player') {
                for (const enemy of this.enemies) {
                    if (!enemy.isAlive) continue;
                    
                    // 简单的点圆与矩形的碰撞判定，这里简化为包围矩形判定
                    const bounds = enemy.getBounds();
                    if (b.x >= bounds.x && b.x <= bounds.x + bounds.width &&
                        b.y >= bounds.y && b.y <= bounds.y + bounds.height) {
                        
                        enemy.takeDamage(b.damage);
                        b.isAlive = false;
                        break;
                    }
                }
            } 
            // 2. 如果是敌人子弹，判定是否命中玩家
            else if (b.ownerType === 'enemy' && this.player && this.player.isAlive) {
                const bounds = this.player.getBounds();
                if (b.x >= bounds.x && b.x <= bounds.x + bounds.width &&
                    b.y >= bounds.y && b.y <= bounds.y + bounds.height) {
                    
                    this.player.takeDamage(b.damage);
                    this.updateHUD(); // 更新血量条显示
                    b.isAlive = false;
                }
            }

            // 3. 子弹与子弹互相拦截摧毁 (极度炫酷，提高微操上限)
            if (!b.isAlive) continue;
            for (let otherIndex = bIndex - 1; otherIndex >= 0; otherIndex--) {
                const other = this.bullets[otherIndex];
                if (!other.isAlive || other.ownerType === b.ownerType) continue;

                const dist = Math.hypot(b.x - other.x, b.y - other.y);
                if (dist < b.radius + other.radius + 2) {
                    b.isAlive = false;
                    other.isAlive = false;
                    ParticleSystem.spawnExplosion((b.x + other.x)/2, (b.y + other.y)/2, '#ffffff', 5, 2);
                    SoundFX.playHit();
                    break;
                }
            }
        }
    },

    // 几率生成道具
    checkPowerUpDrop(x, y) {
        if (Math.random() < 0.16) {
            const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];
            this.powerUps.push({
                x: x,
                y: y,
                type: type,
                radius: 12,
                pulse: 0,
                duration: 500 // 500帧后道具消失（闪烁退场）
            });
            // 道具出现时的小特效
            ParticleSystem.spawnExplosion(x, y, '#39ff14', 8, 2);
        }
    },

    // 处理玩家触碰道具
    resolvePowerUpCollisions() {
        if (!this.player || !this.player.isAlive) return;

        const pBounds = this.player.getBounds();
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];
            
            p.duration--;
            if (p.duration <= 0) {
                this.powerUps.splice(i, 1);
                continue;
            }

            // 判断相交 (点到圆距离或简化重叠)
            if (p.x >= pBounds.x - 5 && p.x <= pBounds.x + pBounds.width + 5 &&
                p.y >= pBounds.y - 5 && p.y <= pBounds.y + pBounds.height + 5) {
                
                this.triggerPowerUpEffect(p.type);
                this.powerUps.splice(i, 1);
            }
        }
    },

    // 道具具体生效行为
    triggerPowerUpEffect(type) {
        if (type === 'grenade') {
            // 核弹：摧毁当前所有杂兵
            SoundFX.playExplosion();
            ParticleSystem.triggerShake(16, 25);
            for (const enemy of this.enemies) {
                if (enemy.isAlive) {
                    enemy.takeDamage(99); // 强力秒杀
                }
            }
        } else if (type === 'clock') {
            // 暂停时间：冻结敌人 6 秒
            SoundFX.playPowerUp();
            this.freezeTimer = 360; 
            ParticleSystem.triggerShake(3, 10);
        } else {
            // 其它道具由坦克自行解析 (护盾、满能量等)
            this.player.applyPowerUp(type);
        }
        this.updateHUD();
    },

    // 伤害核心能量基地
    damageBase(amount) {
        if (!this.gameRunning) return;

        this.baseHealth = Math.max(0, this.baseHealth - amount);
        this.updateHUD();

        // 震撼警报震屏与爆破音效
        ParticleSystem.triggerShake(12, 18);
        SoundFX.playExplosion();

        // 动态寻找地图上的基地坐标，在每个基地单元上生成爆破火花
        for (let r = 0; r < GameMap.ROWS; r++) {
            for (let c = 0; c < GameMap.COLS; c++) {
                if (GameMap.currentGrid[r][c] === GameMap.TILE_BASE) {
                    const baseX = c * GameMap.TILE_SIZE + GameMap.TILE_SIZE / 2;
                    const baseY = r * GameMap.TILE_SIZE + GameMap.TILE_SIZE / 2;
                    ParticleSystem.spawnExplosion(baseX, baseY, '#ff3333', 10, 3);
                }
            }
        }

        if (this.baseHealth <= 0) {
            this.endGame(false); // 基地被破，游戏落败！
        }
    },

    // 检测战役关卡是否通关
    checkLevelClearCondition() {
        if (this.currentMode === 'campaign' && !this.isTestMode) {
            // 屏幕上没有残留敌人，且敌人列表已刷新完毕
            if (this.enemies.length === 0 && this.enemiesRemainingToSpawn === 0) {
                this.endGame(true); // 通关
            }
        }
    },

    // ==========================================
    // 5. 游戏结算与商店系统
    // ==========================================
    endGame(isVictory, isSilentQuit = false) {
        this.gameRunning = false;
        
        if (isSilentQuit) return;

        // 存盘与排行榜
        this.saveHighScore();

        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        const subtitle = document.getElementById('overlay-subtitle');
        const actionBtn = document.getElementById('btn-overlay-action');

        if (isVictory) {
            // 战役胜利
            SoundFX.playVictory();
            
            // 每次通关均进入升级商店，随后继续战斗实现无限战役
            setTimeout(() => {
                document.getElementById('screen-game').classList.remove('active');
                document.getElementById('screen-shop').classList.add('active');
                this.initUpgradeShop();
            }, 1000);
            return;
        } else {
            // 失败
            SoundFX.playGameOver();
            title.textContent = 'MISSION FAILED';
            title.style.color = '#ff3333';
            title.style.textShadow = '0 0 15px rgba(255, 51, 51, 0.6)';
            
            if (this.isTestMode) {
                subtitle.textContent = '测试失败，请重整旗鼓！';
                actionBtn.querySelector('.btn-text').textContent = '修改地图';
            } else {
                subtitle.innerHTML = `您的基地或战车已被瓦解。<br>最终成绩: <span class="neon-pink" style="font-weight:bold;">${this.score}</span>`;
                actionBtn.querySelector('.btn-text').textContent = '再试一次';
            }
        }

        overlay.classList.remove('hidden');
    },

    // 激活升级商店
    initUpgradeShop() {
        // 每通过一关，赠送随着关卡数递增的能量核心数量 (第一关2个，第二关3个，第三关4个...)
        const coresEarned = 2 + this.currentLevelIndex;
        this.shopCores += coresEarned;
        
        document.getElementById('shop-cores-count').textContent = this.shopCores;

        // 动态修改副标题以显示刚刚获得的数量，强化新鲜感与通关成就感
        const shopDesc = document.querySelector('.shop-header p');
        if (shopDesc) {
            shopDesc.innerHTML = `恭喜通关 Level ${this.currentLevelIndex + 1}！获得能量核心 <span class="neon-green" style="font-weight:bold;text-shadow:0 0 5px var(--neon-green)">+${coresEarned} 🔋</span>！`;
        }
        
        // 更新每张属性升级卡的圆点指示器
        this.updateShopCardUI('speed');
        this.updateShopCardUI('damage');
        this.updateShopCardUI('fireRate');
        this.updateShopCardUI('shield');
    },

    updateShopCardUI(type) {
        const card = document.querySelector(`.shop-item[data-upgrade="${type}"]`);
        const currentLvl = this.upgrades[type];
        const dots = card.querySelectorAll('.lvl-dot');
        
        // 激活亮圆点
        dots.forEach((dot, idx) => {
            if (idx < currentLvl) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        const btn = card.querySelector('.btn-buy');
        if (currentLvl >= 5) {
            btn.textContent = 'MAX 等级';
            btn.classList.add('disabled');
            btn.disabled = true;
        } else {
            const cost = this.upgradeCosts[type][currentLvl - 1] || 1;
            btn.textContent = `升级 (花费 ${cost} 🔋)`;
            btn.classList.remove('disabled');
            btn.disabled = false;
        }
    },

    purchaseUpgrade(type, card) {
        const currentLvl = this.upgrades[type];
        if (currentLvl >= 5) return;

        const cost = this.upgradeCosts[type][currentLvl - 1];
        if (this.shopCores >= cost) {
            this.shopCores -= cost;
            this.upgrades[type]++;
            
            SoundFX.playPowerUp();
            document.getElementById('shop-cores-count').textContent = this.shopCores;
            
            this.updateShopCardUI(type);
        } else {
            alert('能量核心不足！快去打败更多敌军战车。');
        }
    },

    // ==========================================
    // 6. 渲染引擎
    // ==========================================
    draw(time) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        
        // 应用屏幕抖动位移
        this.ctx.translate(ParticleSystem.shakeX, ParticleSystem.shakeY);

        // 1. 绘制宇宙星空/雷达网格作为画布背景
        this.ctx.fillStyle = '#020308';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. 绘制履带印记层 (最底层)
        ParticleSystem.drawTracks(this.ctx);

        // 3. 绘制静态和动态地图图层 (砖墙/钢化/水路/基地)
        GameMap.draw(this.ctx, time);

        // 4. 绘制飘落的升级道具
        for (const p of this.powerUps) {
            this.drawPowerUp(this.ctx, p, time);
        }

        // 5. 绘制玩家坦克
        if (this.player && this.player.isAlive) {
            this.player.draw(this.ctx);
        }

        // 6. 绘制所有敌人坦克
        for (const enemy of this.enemies) {
            enemy.draw(this.ctx);
        }

        // 7. 绘制子弹层
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }

        // 8. 绘制草丛图层 (覆盖在坦克之上，遮掩行踪)
        GameMap.drawGrassLayer(this.ctx, time);

        // 9. 渲染高饱和粒子与火焰火花
        ParticleSystem.drawParticles(this.ctx);

        // 10. 绘制倒计时等 HUD overlay
        if (this.freezeTimer > 0) {
            this.drawFreezeBorder();
        }

        // 11. 绘制玩家受击红色屏幕警报边缘发光
        if (this.damageFlashTimer > 0) {
            this.drawDamageFlash();
        }

        this.ctx.restore();
    },

    // 绘制道具卡外观
    drawPowerUp(ctx, p, time) {
        const pulse = Math.sin(time * 0.01) * 3;
        ctx.save();
        
        // 霓虹绿发光圆圈
        ctx.shadowBlur = 10 + pulse;
        ctx.shadowColor = '#39ff14';
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2.5;

        // 如果快要到期，则频闪闪烁
        if (p.duration < 120 && Math.floor(time / 100) % 2 === 0) {
            ctx.strokeStyle = 'transparent';
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + pulse/2, 0, Math.PI * 2);
        ctx.stroke();

        // 填充科幻底色
        ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
        ctx.fill();

        // 绘制道具中心图标
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let icon = '?';
        if (p.type === 'shield') icon = '🛡️';
        if (p.type === 'repair') icon = '🔧';
        if (p.type === 'star') icon = '⭐';
        if (p.type === 'grenade') icon = '💣';
        if (p.type === 'clock') icon = '⏰';

        ctx.fillText(icon, p.x, p.y + 1);
        ctx.restore();
    },

    // 屏幕时间冻结时，四周笼罩一层蓝色科技光幕
    drawFreezeBorder() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        this.ctx.lineWidth = 8;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制“时间凝结中”文字提示
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.font = '16px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`⚡ TIME FROZEN: ${(this.freezeTimer/60).toFixed(1)}S`, 400, 30);
        this.ctx.restore();
    },

    // 玩家受击时，四周笼罩一层红色警报滤镜
    drawDamageFlash() {
        this.ctx.save();
        const alpha = (this.damageFlashTimer / 15) * 0.45;
        this.ctx.strokeStyle = `rgba(255, 51, 51, ${alpha})`;
        this.ctx.lineWidth = 12;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制半透明全屏微红底色，增强受击震慑力
        this.ctx.fillStyle = `rgba(255, 51, 51, ${(this.damageFlashTimer / 15) * 0.08})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    },

    // ==========================================
    // 7. HUD数据及成绩存储
    // ==========================================
    updateHUD() {
        // 得分补齐 6 位数
        const scoreStr = String(this.score).padStart(6, '0');
        document.getElementById('hud-score').textContent = scoreStr;

        // 更新生命条
        if (this.player) {
            const hpPct = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
            const hpBar = document.getElementById('hud-health-bar');
            hpBar.style.width = `${hpPct}%`;
            
            // 属性面板数据更新
            document.getElementById('mini-speed-level').textContent = `LV${this.player.upgrades.speed}`;
            document.getElementById('mini-damage-level').textContent = `LV${this.player.upgrades.damage}`;
            document.getElementById('mini-fire-level').textContent = `LV${this.player.upgrades.fireRate}`;

            // 更新弹药格 blocks
            const ammoBlocks = document.getElementById('ammo-blocks');
            ammoBlocks.innerHTML = '';
            for (let i = 0; i < this.player.maxAmmo; i++) {
                const block = document.createElement('div');
                block.className = `ammo-block ${i < this.player.ammo ? 'active' : ''}`;
                ammoBlocks.appendChild(block);
            }
        }

        // 更新基地装甲条
        const basePct = Math.max(0, (this.baseHealth / this.baseMaxHealth) * 100);
        document.getElementById('hud-base-bar').style.width = `${basePct}%`;
    },

    loadLeaderboard() {
        try {
            const saved = localStorage.getItem('neon_tank_scores');
            if (saved) {
                this.highScores = JSON.parse(saved);
            } else {
                this.highScores = [
                    { name: 'CYBER_COMMANDER', score: 25000 },
                    { name: 'NEON_PILOT', score: 18000 },
                    { name: 'RETRO_GRID', score: 12000 }
                ];
                this.saveLeaderboard();
            }
        } catch(e) {
            console.error("Local storage error", e);
        }
    },

    saveLeaderboard() {
        try {
            localStorage.setItem('neon_tank_scores', JSON.stringify(this.highScores));
        } catch(e) {
            console.error(e);
        }
    },

    saveHighScore() {
        if (this.score <= 0) return;
        
        let pilotName = 'PILOT_' + Math.floor(100 + Math.random() * 900);
        const nameInput = prompt(`🎉 恭喜！您获得了 ${this.score} 分！请输入您的赛博机师代号：`, pilotName);
        if (nameInput) {
            pilotName = nameInput.trim().toUpperCase().slice(0, 16);
        }

        this.highScores.push({ name: pilotName, score: this.score });
        // 从大到小排序，只取前5名
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 5);

        this.saveLeaderboard();
        this.renderLeaderboard();
    },

    renderLeaderboard() {
        const listContainer = document.getElementById('menu-high-scores');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        this.highScores.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'score-row';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = entry.name;
            
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'score';
            scoreSpan.textContent = entry.score.toLocaleString();

            row.appendChild(nameSpan);
            row.appendChild(scoreSpan);
            listContainer.appendChild(row);
        });
    }
};

// 页面加载完成后自启动底层粒子背景与全局游戏配置
window.addEventListener('DOMContentLoaded', () => {
    BgParticles.init();
    Game.init();
});
