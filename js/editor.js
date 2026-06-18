/* ==========================================
   NEON TANK BUSTERS VISUAL LEVEL EDITOR
   ========================================== */

const LevelEditor = {
    canvas: null,
    ctx: null,
    selectedTile: 1, // 默认绘制砖墙
    grid: [],
    isDrawing: false,

    init() {
        this.canvas = document.getElementById('editor-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.resetGrid();
        this.bindEvents();
        this.startLoop();
    },

    resetGrid() {
        this.grid = Array(GameMap.ROWS).fill(null).map(() => Array(GameMap.COLS).fill(0));
        
        // 预设摆放玩家能量核心基地 (Row 19, Col 9 & 10)
        this.grid[19][9] = GameMap.TILE_BASE;
        this.grid[19][10] = GameMap.TILE_BASE;

        // 默认围住基地的砖墙
        this.grid[18][8] = GameMap.TILE_BRICK;
        this.grid[18][9] = GameMap.TILE_BRICK;
        this.grid[18][10] = GameMap.TILE_BRICK;
        this.grid[18][11] = GameMap.TILE_BRICK;
        this.grid[19][8] = GameMap.TILE_BRICK;
        this.grid[19][11] = GameMap.TILE_BRICK;
    },

    bindEvents() {
        // 1. 调色板选择
        const paletteItems = document.querySelectorAll('.palette-item');
        paletteItems.forEach(item => {
            item.addEventListener('click', () => {
                paletteItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.selectedTile = parseInt(item.getAttribute('data-tile'));
            });
        });

        // 2. 鼠标点击/拖拽网格绘制
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.paintTile(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.paintTile(e);
        });

        window.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });

        // 3. 按钮操作
        document.getElementById('btn-editor-clear').addEventListener('click', () => {
            if (confirm('确定要清空当前绘制的网格吗？')) {
                this.resetGrid();
            }
        });

        document.getElementById('btn-editor-presets').addEventListener('click', () => {
            const choice = prompt("请输入要载入的预设关卡模板编号 (1-5)：");
            if (choice) {
                const idx = parseInt(choice) - 1;
                if (idx >= 0 && idx < GameMap.levels.length) {
                    this.grid = JSON.parse(JSON.stringify(GameMap.levels[idx]));
                    alert(`成功载入关卡 ${choice} 的模板！`);
                } else {
                    alert("❌ 载入失败：关卡编号范围应在 1 至 5 之间！");
                }
            }
        });

        document.getElementById('btn-editor-import').addEventListener('click', () => {
            const jsonStr = prompt("请输入您导出的地图JSON数据（格式如：[[0,0...]]）：");
            if (jsonStr) {
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (Array.isArray(parsed) && parsed.length === GameMap.ROWS && Array.isArray(parsed[0]) && parsed[0].length === GameMap.COLS) {
                        this.grid = parsed;
                        alert("地图导入成功！");
                    } else {
                        alert("❌ 导入失败：数据格式不正确，必须是 20x20 的二维数组。");
                    }
                } catch (e) {
                    alert("❌ 导入失败：JSON 解析出错，请确保输入了完整合法的导出代码。");
                }
            }
        });

        document.getElementById('btn-editor-export').addEventListener('click', () => {
            this.exportMap();
        });

        document.getElementById('btn-editor-save').addEventListener('click', () => {
            localStorage.setItem('neon_tank_custom_map', JSON.stringify(this.grid));
            alert("地图已成功保存至本地浏览器缓存！");
        });

        document.getElementById('btn-editor-load').addEventListener('click', () => {
            const saved = localStorage.getItem('neon_tank_custom_map');
            if (saved) {
                try {
                    this.grid = JSON.parse(saved);
                    alert("已成功从本地浏览器缓存中读取并载入地图！");
                } catch (e) {
                    alert("❌ 读取失败：本地保存的数据格式已损坏。");
                }
            } else {
                alert("未找到本地保存的地图数据！");
            }
        });

        // 导出模态窗按钮
        document.getElementById('btn-modal-copy').addEventListener('click', () => {
            const textarea = document.getElementById('export-code-area');
            textarea.select();
            document.execCommand('copy');
            alert('代码已成功复制到剪切板！');
        });

        document.getElementById('btn-modal-close').addEventListener('click', () => {
            document.getElementById('modal-export').classList.add('hidden');
        });

        document.getElementById('btn-editor-back').addEventListener('click', () => {
            if (confirm('确定要退出地图编辑器吗？未导出的修改将会丢失。')) {
                this.stopLoop();
                document.getElementById('screen-editor').classList.remove('active');
                document.getElementById('screen-menu').classList.add('active');
            }
        });

        document.getElementById('btn-editor-play').addEventListener('click', () => {
            this.playTestMap();
        });
    },

    // 计算鼠标在 Canvas 上的网格行和列并上色
    paintTile(e) {
        const rect = this.canvas.getBoundingClientRect();
        // 计算缩放比例，应对 CSS 改变尺寸导致的偏差
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const col = Math.floor(x / GameMap.TILE_SIZE);
        const row = Math.floor(y / GameMap.TILE_SIZE);

        if (row >= 0 && row < GameMap.ROWS && col >= 0 && col < GameMap.COLS) {
            // 如果玩家画的是基地 (9)
            if (this.selectedTile === GameMap.TILE_BASE) {
                // 限制最底部，且由于基地是核心，最多画两格
                // 暂时允许在任何网格点涂写，但清除其它多余的基地
                this.grid[row][col] = GameMap.TILE_BASE;
            } else {
                this.grid[row][col] = this.selectedTile;
            }
        }
    },

    exportMap() {
        const dataStr = JSON.stringify(this.grid);
        document.getElementById('export-code-area').value = dataStr;
        document.getElementById('modal-export').classList.remove('hidden');
    },

    playTestMap() {
        // 验证地图有效性：至少需要有 1 个基地 (TILE_BASE = 9)
        let baseCount = 0;
        for (let r = 0; r < GameMap.ROWS; r++) {
            for (let c = 0; c < GameMap.COLS; c++) {
                if (this.grid[r][c] === GameMap.TILE_BASE) baseCount++;
            }
        }

        if (baseCount === 0) {
            alert('❌ 无法测试：您的地图中没有“能量基地”，请先在底部画上基地！');
            return;
        }

        // 保存网格到 GameMap currentGrid 并开始游戏
        this.stopLoop();
        document.getElementById('screen-editor').classList.remove('active');
        document.getElementById('screen-game').classList.add('active');

        // 将当前网格灌入运行时
        GameMap.currentGrid = JSON.parse(JSON.stringify(this.grid));
        // 重置砖墙血量
        GameMap.brickHealth = {};
        for (let r = 0; r < GameMap.ROWS; r++) {
            for (let c = 0; c < GameMap.COLS; c++) {
                if (GameMap.currentGrid[r][c] === GameMap.TILE_BRICK) {
                    GameMap.brickHealth[`${r},${c}`] = 2;
                }
            }
        }

        // 启动测试模式游戏
        if (typeof Game !== 'undefined') {
            Game.startCustomPlay(true); // true 表示测试模式
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. 画黑色电子背景底色
        this.ctx.fillStyle = '#020308';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. 借用地图模块绘制已经涂画的地形
        // 注入当前网格到运行时，以配合绘制函数
        const oldGrid = GameMap.currentGrid;
        const oldHealth = GameMap.brickHealth;
        
        GameMap.currentGrid = this.grid;
        // 假设编辑器的砖墙全是满血
        GameMap.brickHealth = {};
        for (let r = 0; r < GameMap.ROWS; r++) {
            for (let c = 0; c < GameMap.COLS; c++) {
                if (this.grid[r][c] === GameMap.TILE_BRICK) {
                    GameMap.brickHealth[`${r},${c}`] = 2;
                }
            }
        }

        // 调用渲染
        GameMap.draw(this.ctx, Date.now());
        GameMap.drawGrassLayer(this.ctx, Date.now());

        // 恢复运行时
        GameMap.currentGrid = oldGrid;
        GameMap.brickHealth = oldHealth;

        // 3. 画发光的网格边界线
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let r = 0; r <= GameMap.ROWS; r++) {
            this.ctx.moveTo(0, r * GameMap.TILE_SIZE);
            this.ctx.lineTo(this.canvas.width, r * GameMap.TILE_SIZE);
        }
        for (let c = 0; c <= GameMap.COLS; c++) {
            this.ctx.moveTo(c * GameMap.TILE_SIZE, 0);
            this.ctx.lineTo(c * GameMap.TILE_SIZE, this.canvas.height);
        }
        this.ctx.stroke();
        this.ctx.restore();

        // 4. 绘制坦克出生标记提示 (绿色：玩家，红色：敌人)
        this.ctx.save();
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);

        // 玩家出生点 Row 19, Col 6
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.beginPath();
        this.ctx.arc(6 * GameMap.TILE_SIZE + 20, 19 * GameMap.TILE_SIZE + 20, 16, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.font = '9px Orbitron';
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.fillText('P_SPAWN', 6 * GameMap.TILE_SIZE + 1, 19 * GameMap.TILE_SIZE + 23);

        // 敌人出生地 1: Row 0, Col 0
        this.ctx.strokeStyle = '#ff007f';
        this.ctx.beginPath();
        this.ctx.arc(0 * GameMap.TILE_SIZE + 20, 0 * GameMap.TILE_SIZE + 20, 16, 0, Math.PI * 2);
        // 敌人出生地 2: Row 0, Col 9
        this.ctx.arc(9 * GameMap.TILE_SIZE + 20, 0 * GameMap.TILE_SIZE + 20, 16, 0, Math.PI * 2);
        // 敌人出生地 3: Row 0, Col 19
        this.ctx.arc(19 * GameMap.TILE_SIZE + 20, 0 * GameMap.TILE_SIZE + 20, 16, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#ff007f';
        this.ctx.fillText('E_SPAWN', 0 * GameMap.TILE_SIZE + 1, 0 * GameMap.TILE_SIZE + 23);
        this.ctx.fillText('E_SPAWN', 9 * GameMap.TILE_SIZE + 1, 0 * GameMap.TILE_SIZE + 23);
        this.ctx.fillText('E_SPAWN', 19 * GameMap.TILE_SIZE + 1, 0 * GameMap.TILE_SIZE + 23);
        
        this.ctx.restore();
    },

    startLoop() {
        this.active = true;
        const tick = () => {
            if (!this.active) return;
            this.draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },

    stopLoop() {
        this.active = false;
    }
};
