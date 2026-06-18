/* ==========================================
   NEON TANK BUSTERS MAP & LEVEL CONFIGURATION
   ========================================== */

const GameMap = {
    ROWS: 20,
    COLS: 20,
    TILE_SIZE: 40, // 20 * 40 = 800px width/height

    // 瓷砖类型常量
    TILE_EMPTY: 0,
    TILE_BRICK: 1,
    TILE_STEEL: 2,
    TILE_WATER: 3,
    TILE_GRASS: 4,
    TILE_BASE: 9,

    // 当前关卡运行时的地图矩阵
    currentGrid: [],
    
    // 砖墙的血量记录，如果是0，代表彻底被摧毁
    brickHealth: {},

    // 默认关卡模板 (20行 x 20列)
    // 0: 空地, 1: 砖墙, 2: 钢墙, 3: 水, 4: 草, 9: 基地
    levels: [
        // Level 1: 经典对称战壕
        [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,1,1,0,1,1,0,0,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,1,1,0,1,1,0,0,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,1,1,0,1,1,2,2,1,1,0,1,1,0,1,1,0],
            [0,1,1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,1,0],
            [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
            [1,1,0,2,2,0,1,1,1,0,0,1,1,1,0,2,2,0,1,1],
            [4,4,0,2,2,0,1,1,0,0,0,0,1,1,0,2,2,0,4,4],
            [4,4,0,0,0,0,1,1,0,2,2,0,1,1,0,0,0,0,4,4],
            [0,0,0,1,1,0,0,0,0,2,2,0,0,0,0,1,1,0,0,0],
            [0,1,0,1,1,0,1,1,0,0,0,0,1,1,0,1,1,0,1,0],
            [0,1,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,1,0],
            [0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,0,1,1,0,1,1,0,0,0,0,1,1,0,1,1,0,1,1],
            [1,1,0,1,1,0,1,1,0,0,0,0,1,1,0,1,1,0,1,1],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,1,1,1,0,1,1,1,1,0,1,1,1,0,1,1,0],
            [0,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1,0],
            [0,0,0,0,1,1,0,0,1,9,9,1,0,0,1,1,0,0,0,0]
        ],
        // Level 2: 水路穿梭与狙击
        [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,0,2,2,0,0,1,1,0,0,2,2,0,0,1,1,0],
            [0,1,1,0,0,2,2,0,0,1,1,0,0,2,2,0,0,1,1,0],
            [3,3,3,3,0,0,0,0,3,3,3,3,0,0,0,0,3,3,3,3],
            [4,4,4,4,0,1,1,0,4,4,4,4,0,1,1,0,4,4,4,4],
            [0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0],
            [0,2,2,1,1,2,2,1,1,0,0,1,1,2,2,1,1,2,2,0],
            [0,2,2,1,1,2,2,1,1,0,0,1,1,2,2,1,1,2,2,0],
            [0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0],
            [3,3,3,0,1,1,1,1,0,2,2,0,1,1,1,1,0,3,3,3],
            [3,3,3,0,1,1,1,1,0,0,0,0,1,1,1,1,0,3,3,3],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,0],
            [0,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,1,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4],
            [1,1,1,0,1,1,1,1,0,0,0,0,1,1,1,1,0,1,1,1],
            [0,0,0,0,1,1,1,1,0,1,1,0,1,1,1,1,0,0,0,0],
            [0,2,2,0,0,0,0,0,0,1,1,0,0,0,0,0,0,2,2,0],
            [0,2,2,0,1,1,0,0,1,9,9,1,0,0,1,1,0,2,2,0]
        ],
        // Level 3: 隐秘草丛迷宫
        [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,4,4,4,4,4,4,4,4,0,0,4,4,4,4,4,4,4,4,0],
            [0,4,1,1,2,2,1,1,4,0,0,4,1,1,2,2,1,1,4,0],
            [0,4,1,1,2,2,1,1,4,0,0,4,1,1,2,2,1,1,4,0],
            [0,4,4,4,0,0,4,4,4,1,1,4,4,4,0,0,4,4,4,0],
            [0,2,2,0,0,0,0,2,2,1,1,2,2,0,0,0,0,2,2,0],
            [0,1,1,0,4,4,0,1,1,0,0,1,1,0,4,4,0,1,1,0],
            [0,1,1,0,4,4,0,1,1,0,0,1,1,0,4,4,0,1,1,0],
            [0,0,0,0,4,4,0,0,0,0,0,0,0,0,4,4,0,0,0,0],
            [2,2,3,3,4,4,3,3,2,2,2,2,3,3,4,4,3,3,2,2],
            [2,2,3,3,4,4,3,3,2,2,2,2,3,3,4,4,3,3,2,2],
            [0,0,0,0,4,4,0,0,0,0,0,0,0,0,4,4,0,0,0,0],
            [0,1,1,0,4,4,0,1,1,0,0,1,1,0,4,4,0,1,1,0],
            [0,1,1,0,4,4,0,1,1,0,0,1,1,0,4,4,0,1,1,0],
            [0,2,2,0,0,0,0,2,2,0,0,2,2,0,0,0,0,2,2,0],
            [0,4,4,4,0,0,4,4,4,0,0,4,4,4,0,0,4,4,4,0],
            [0,4,1,1,2,2,1,1,4,0,0,4,1,1,2,2,1,1,4,0],
            [0,4,1,1,2,2,1,1,4,0,0,4,1,1,2,2,1,1,4,0],
            [0,4,4,4,4,4,4,4,4,1,1,4,4,4,4,4,4,4,4,0],
            [0,0,0,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0,0,0]
        ],
        // Level 4: 钢铁螺旋堡垒
        [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,2,2,1,1,2,2,2,0,0,2,2,2,1,1,2,2,0,0], // 开放外围钢墙：两翼为砖墙入口，中上出生点清空
            [0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0],
            [0,2,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,0],
            [0,2,0,1,2,2,2,2,2,1,1,2,2,2,2,2,1,0,2,0], // 开放顶部中间为砖墙，坦克可以打穿进入
            [0,2,0,1,2,0,0,0,0,0,0,0,0,0,0,2,1,0,2,0],
            [0,2,0,1,2,0,1,1,1,3,3,1,1,1,0,2,1,0,2,0],
            [0,2,0,1,2,0,1,2,2,0,0,2,2,1,0,2,1,0,2,0],
            [0,2,0,1,2,0,1,2,0,0,0,0,2,1,0,2,1,0,2,0],
            [0,2,0,1,2,0,3,2,0,0,0,0,2,3,0,2,1,0,2,0],
            [0,2,0,1,2,0,3,2,0,0,0,0,2,3,0,2,1,0,2,0],
            [0,2,0,1,2,0,1,2,0,0,0,0,2,1,0,2,1,0,2,0],
            [0,2,0,1,2,0,1,2,2,2,2,2,2,1,0,2,1,0,2,0],
            [0,2,0,1,2,0,1,1,1,1,1,1,1,1,0,2,1,0,2,0],
            [0,2,0,1,2,0,0,0,0,0,0,0,0,0,0,2,1,0,2,0],
            [0,2,0,1,2,2,2,2,2,1,1,2,2,2,2,2,1,0,2,0], // 开放底部中间为砖墙，坦克可以打穿进入
            [0,2,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,2,0],
            [0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0],
            [0,0,2,2,1,1,2,2,2,0,0,2,2,2,1,1,2,2,0,0], // 开放底部外围钢墙：留出对称入口，且保证基地外侧开阔
            [0,0,0,0,0,0,0,0,0,9,9,0,0,0,0,0,0,0,0,0]
        ],
        // Level 5: 终极防线决战
        [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,2,0,0,0,0,2,2,0,0,2,2,0,0,0,0,2,2,0], // 清空左上、中上敌人出生点处的阻挡钢墙
            [0,2,2,0,1,1,0,1,1,2,2,1,1,0,1,1,0,2,2,0],
            [0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0],
            [0,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0],
            [0,1,1,1,1,1,1,1,0,2,2,0,1,1,1,1,1,1,1,0],
            [0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0],
            [2,2,3,3,1,1,3,3,2,0,0,2,3,3,1,1,3,3,2,2], // 在 row 7 的河道屏障中打开可摧毁的砖墙及中央空地通道
            [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,1,0,0,1,1,1,0,0,1,1,1,0,0,1,1,1,0],
            [0,2,2,2,0,0,2,2,2,0,0,2,2,2,0,0,2,2,2,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,1,1],
            [2,2,0,0,2,2,2,2,0,0,0,0,2,2,2,2,0,0,2,2],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0],
            [0,1,1,0,1,1,1,1,2,2,2,2,1,1,1,1,0,1,1,0],
            [0,1,1,0,1,1,1,1,2,2,2,2,1,1,1,1,0,1,1,0],
            [0,0,0,0,1,1,0,0,1,9,9,1,0,0,1,1,0,0,0,0]
        ]
    ],

    // 根据关卡索引加载地图
    loadLevel(levelIndex) {
        let template;
        if (levelIndex < this.levels.length) {
            template = this.levels[levelIndex];
        } else {
            // 如果超出关卡包，生成一个随机关卡
            template = this.generateRandomTemplate();
        }

        // 深拷贝地图数据到当前矩阵
        this.currentGrid = JSON.parse(JSON.stringify(template));
        
        // 重置砖墙血量 (每块砖墙可以承受 2 次撞击)
        this.brickHealth = {};
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.currentGrid[r][c] === this.TILE_BRICK) {
                    this.brickHealth[`${r},${c}`] = 2; // 初始生命值为 2
                }
            }
        }
    },

    // 随机生成关卡模板 (用于无限模式或溢出关卡)
    generateRandomTemplate() {
        const grid = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(0));
        
        // 随机填充墙壁和地形
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS; c++) {
                // 边界避开生成，防止卡死
                if (r < 2 && c < 2) continue; // 避开左上角敌人出生地 (col 0-1, row 0-1)
                if (r < 2 && c >= 8 && c <= 10) continue; // 避开中上角敌人出生地 (col 8-10, row 0-1)
                if (r < 2 && c > this.COLS - 3) continue; // 避开右上角敌人出生地 (col 18-19, row 0-1)

                const rand = Math.random();
                if (rand < 0.15) {
                    grid[r][c] = this.TILE_BRICK;
                } else if (rand < 0.22) {
                    // 保证第 5 列和第 14 列作为打通的纵向战略通道，不生成不可摧毁的钢墙或阻挡的水域
                    if (c !== 5 && c !== 14) {
                        grid[r][c] = this.TILE_STEEL;
                    } else {
                        grid[r][c] = this.TILE_BRICK; // 替换为可击碎的砖墙
                    }
                } else if (rand < 0.27) {
                    if (c !== 5 && c !== 14) {
                        grid[r][c] = this.TILE_WATER;
                    } else {
                        grid[r][c] = this.TILE_EMPTY; // 替换为空地
                    }
                } else if (rand < 0.35) {
                    grid[r][c] = this.TILE_GRASS;
                }
            }
        }

        // 基地放置在最下方正中
        grid[19][9] = this.TILE_BASE;
        grid[19][10] = this.TILE_BASE;
        
        // 保护基地的砖墙
        grid[18][8] = this.TILE_BRICK;
        grid[18][9] = this.TILE_BRICK;
        grid[18][10] = this.TILE_BRICK;
        grid[18][11] = this.TILE_BRICK;
        grid[19][8] = this.TILE_BRICK;
        grid[19][11] = this.TILE_BRICK;

        return grid;
    },

    // 伤害特定网格的砖墙
    damageBrick(row, col, amount = 1) {
        const key = `${row},${col}`;
        if (this.brickHealth[key] !== undefined) {
            this.brickHealth[key] -= amount;
            if (this.brickHealth[key] <= 0) {
                this.currentGrid[row][col] = this.TILE_EMPTY;
                delete this.brickHealth[key];
                return true; // 彻底摧毁
            }
        }
        return false;
    },

    // 检查网格是否有阻挡坦克通行的物体
    isBlocked(row, col) {
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) {
            return true; // 超出边界被阻挡
        }
        const val = this.currentGrid[row][col];
        // 砖墙、钢墙、水路阻挡坦克；草丛和空地不阻挡；基地也阻挡
        return (val === this.TILE_BRICK || val === this.TILE_STEEL || val === this.TILE_WATER || val === this.TILE_BASE);
    },

    // 检查网格是否有阻挡子弹通行的物体
    isBulletBlocked(row, col) {
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) {
            return true; // 越界即阻挡
        }
        const val = this.currentGrid[row][col];
        // 砖墙、钢墙和基地阻挡子弹；水、草和空地不阻挡
        return (val === this.TILE_BRICK || val === this.TILE_STEEL || val === this.TILE_BASE);
    },

    // 渲染地图
    draw(ctx, time) {
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const val = this.currentGrid[r][c];
                if (val === this.TILE_EMPTY) continue;

                const x = c * this.TILE_SIZE;
                const y = r * this.TILE_SIZE;
                const size = this.TILE_SIZE;

                ctx.save();
                
                // 开启发光属性，为霓虹世界渲染打下基础
                ctx.shadowBlur = 8;

                switch (val) {
                    case this.TILE_BRICK:
                        // 砖墙：橙红色霓虹方格，根据血量显示不同的磨损/色调
                        const health = this.brickHealth[`${r},${c}`] || 2;
                        ctx.shadowColor = '#f97316';
                        ctx.strokeStyle = '#f97316';
                        ctx.fillStyle = health === 2 ? 'rgba(249, 115, 22, 0.25)' : 'rgba(249, 115, 22, 0.08)';
                        ctx.lineWidth = 2;
                        
                        // 绘制外框
                        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
                        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

                        // 绘制纹路表示砖墙
                        ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
                        ctx.beginPath();
                        ctx.moveTo(x + 2, y + size / 2);
                        ctx.lineTo(x + size - 2, y + size / 2);
                        ctx.moveTo(x + size / 2, y + 2);
                        ctx.lineTo(x + size / 2, y + size / 2);
                        ctx.moveTo(x + size / 4, y + size / 2);
                        ctx.lineTo(x + size / 4, y + size - 2);
                        ctx.moveTo(x + (3 * size) / 4, y + size / 2);
                        ctx.lineTo(x + (3 * size) / 4, y + size - 2);
                        ctx.stroke();

                        // 绘制碎裂红点（如果被打过）
                        if (health < 2) {
                            ctx.fillStyle = '#ff3333';
                            ctx.beginPath();
                            ctx.arc(x + size/2 + 2, y + size/3, 2, 0, Math.PI*2);
                            ctx.arc(x + size/3, y + 2*size/3, 1.5, 0, Math.PI*2);
                            ctx.fill();
                        }
                        break;

                    case this.TILE_STEEL:
                        // 钢化合金：青色/冰蓝色霓虹方格，带有斜向条纹，显示极强硬度
                        ctx.shadowColor = '#06b6d4';
                        ctx.strokeStyle = '#06b6d4';
                        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
                        ctx.lineWidth = 3;

                        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
                        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

                        // 绘制十字金属铆钉
                        ctx.fillStyle = '#06b6d4';
                        ctx.fillRect(x + 6, y + 6, 4, 4);
                        ctx.fillRect(x + size - 10, y + 6, 4, 4);
                        ctx.fillRect(x + 6, y + size - 10, 4, 4);
                        ctx.fillRect(x + size - 10, y + size - 10, 4, 4);

                        // 对角斜纹
                        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(x + 5, y + size - 5);
                        ctx.lineTo(x + size - 5, y + 5);
                        ctx.stroke();
                        break;

                    case this.TILE_WATER:
                        // 液体/酸液：波动的亮蓝色波浪，子弹可穿过但坦克阻挡
                        const waveOffset = Math.sin(time * 0.005 + r) * 3;
                        ctx.shadowColor = '#0891b2';
                        ctx.strokeStyle = '#0891b2';
                        ctx.fillStyle = 'rgba(8, 145, 178, 0.2)';
                        ctx.lineWidth = 1;

                        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

                        // 绘制波动曲线
                        ctx.beginPath();
                        ctx.moveTo(x + 1, y + size / 2 + waveOffset);
                        ctx.quadraticCurveTo(x + size/4, y + size/3 + waveOffset, x + size/2, y + size/2 + waveOffset);
                        ctx.quadraticCurveTo(x + 3*size/4, y + 2*size/3 + waveOffset, x + size - 1, y + size/2 + waveOffset);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.moveTo(x + 1, y + size / 3 - waveOffset);
                        ctx.quadraticCurveTo(x + size/4, y + size/2 - waveOffset, x + size/2, y + size/3 - waveOffset);
                        ctx.stroke();
                        break;

                    case this.TILE_GRASS:
                        // 隐匿草：深绿/霓虹绿色斜线条，覆盖在坦克之上（先画坦克后画草）
                        // 注意：为了草丛遮挡坦克，在主渲染循环中，草丛应该在坦克绘制之后单独进行一遍渲染绘制
                        // 这里提供草丛的独立绘制逻辑，主循环中会专门调用
                        ctx.shadowBlur = 4;
                        ctx.shadowColor = '#10b981';
                        ctx.strokeStyle = '#10b981';
                        ctx.lineWidth = 2;

                        // 绘制类似草丛的垂直波浪线条
                        ctx.beginPath();
                        for (let offset = 6; offset < size; offset += 8) {
                            const curve = Math.sin(time * 0.003 + offset) * 2;
                            ctx.moveTo(x + offset, y + size - 2);
                            ctx.quadraticCurveTo(x + offset + curve, y + size/2, x + offset - 2 + curve, y + 4);
                        }
                        ctx.stroke();
                        break;

                    case this.TILE_BASE:
                        // 能量核心基地：一个巨大的发光车身/球心结构
                        const isBroken = (typeof Game !== 'undefined' && Game.baseHealth <= 0);
                        if (isBroken) {
                            ctx.shadowColor = '#ff3333';
                            ctx.strokeStyle = '#ff3333';
                            ctx.fillStyle = 'rgba(255, 51, 51, 0.08)';
                            ctx.lineWidth = 2;

                            // 绘制破碎的防护罩圆弧
                            ctx.beginPath();
                            ctx.arc(x + size / 2, y + size / 2, size / 2 - 3, 0.4, Math.PI - 0.4);
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.arc(x + size / 2, y + size / 2, size / 2 - 3, Math.PI + 0.4, Math.PI * 2 - 0.4);
                            ctx.stroke();

                            // 绘制破裂核心
                            ctx.fillStyle = '#5c0808';
                            ctx.beginPath();
                            ctx.moveTo(x + size / 2, y + 10);
                            ctx.lineTo(x + size - 10, y + size - 8);
                            ctx.lineTo(x + 10, y + size - 8);
                            ctx.closePath();
                            ctx.fill();
                        } else {
                            ctx.shadowColor = '#eab308';
                            ctx.strokeStyle = '#eab308';
                            ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
                            ctx.lineWidth = 2.5;

                            // 绘制护盾球
                            ctx.beginPath();
                            ctx.arc(x + size / 2, y + size / 2, size / 2 - 3, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.fill();

                            // 绘制内部核心三角形
                            ctx.fillStyle = '#eab308';
                            ctx.beginPath();
                            ctx.moveTo(x + size / 2, y + 8);
                            ctx.lineTo(x + size - 8, y + size - 10);
                            ctx.lineTo(x + 8, y + size - 10);
                            ctx.closePath();
                            ctx.fill();

                            // 发光内核核心
                            const corePulse = 2 + Math.abs(Math.sin(time * 0.008)) * 4;
                            ctx.shadowBlur = 10 + corePulse;
                            ctx.fillStyle = '#fff';
                            ctx.beginPath();
                            ctx.arc(x + size / 2, y + size / 2 + 2, corePulse, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        break;
                }
                ctx.restore();
            }
        }
    },

    // 单独渲染草丛图层 (需要在绘制完坦克之后绘制，实现遮挡)
    drawGrassLayer(ctx, time) {
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.currentGrid[r][c] === this.TILE_GRASS) {
                    const x = c * this.TILE_SIZE;
                    const y = r * this.TILE_SIZE;
                    const size = this.TILE_SIZE;

                    ctx.save();
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = '#10b981';
                    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
                    ctx.lineWidth = 2;

                    // 填充草丛半透明绿底
                    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

                    // 绘制多根交叉草叶
                    ctx.beginPath();
                    for (let offset = 6; offset < size; offset += 8) {
                        const curve = Math.sin(time * 0.004 + offset) * 3;
                        ctx.moveTo(x + offset, y + size - 2);
                        ctx.quadraticCurveTo(x + offset + curve, y + size/2, x + offset - 3 + curve, y + 4);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }
};
