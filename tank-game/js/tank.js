/* ==========================================
   NEON TANK BUSTERS TANK CLASSES (PLAYER & ENEMIES)
   ========================================== */

// 基础坦克类 (共享物理、碰撞与排队机制)
class BaseTank {
    constructor(x, y, speed, maxHealth, color, size = 34) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.color = color;
        this.size = size;
        this.width = size;
        this.height = size;
        this.angle = 0; // 车身角度 (弧度)
        this.isAlive = true;
        this.cooldown = 0;
        this.cooldownMax = 35; // 射击冷却帧数
    }

    // 获取坦克的 Bounding Box 矩形
    getBounds(x = this.x, y = this.y) {
        return {
            x: x - this.width / 2,
            y: y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    // 与地图障碍物的碰撞检测
    checkMapCollision(newX, newY) {
        const bounds = this.getBounds(newX, newY);
        const limit = 800;

        // 检查越界
        if (bounds.x < 0 || bounds.x + bounds.width > limit || bounds.y < 0 || bounds.y + bounds.height > limit) {
            return true;
        }

        // 检查重叠的网格单元 (缩减 0.25 像素边缘以实现润滑移动与滑行，防止挤压卡死在墙角)
        const startCol = Math.floor((bounds.x + 0.25) / GameMap.TILE_SIZE);
        const endCol = Math.floor((bounds.x + bounds.width - 0.25) / GameMap.TILE_SIZE);
        const startRow = Math.floor((bounds.y + 0.25) / GameMap.TILE_SIZE);
        const endRow = Math.floor((bounds.y + bounds.height - 0.25) / GameMap.TILE_SIZE);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (GameMap.isBlocked(r, c)) {
                    return true; // 被墙体、水或基地阻挡
                }
            }
        }
        return false;
    }

    // 两个矩形是否重叠的检测
    rectsOverlap(r1, r2) {
        return !(r1.x + r1.width <= r2.x || 
                 r2.x + r2.width <= r1.x || 
                 r1.y + r1.height <= r2.y || 
                 r2.y + r2.height <= r1.y);
    }
}

// ==========================================
// 玩家坦克类
// ==========================================
class PlayerTank extends BaseTank {
    constructor(x, y) {
        // 速度: 2.8, 血量: 3, 霓虹蓝
        super(x, y, 2.8, 3, '#00f0ff');
        this.turretAngle = 0; // 炮塔独立朝向

        // 升级系统层级 (默认等级为1，最高为5)
        this.upgrades = {
            speed: 1,
            damage: 1,
            fireRate: 1,
            shield: 1
        };

        this.shieldTime = 120; // 初始赠送 2 秒出生无敌护盾
        this.invulnerable = true;
        this.maxAmmo = 3;
        this.ammo = 3;
        this.ammoRegenTimer = 0;
    }

    // 应用关卡间的商店升级数据
    applyUpgrades(upgrades) {
        this.upgrades = { ...upgrades };
        
        // 1. 速度升级 (每级增加 0.4 速度)
        this.speed = 2.8 + (this.upgrades.speed - 1) * 0.45;
        
        // 2. 护盾/生命升级 (每级增加 1 格生命)
        const oldMax = this.maxHealth;
        this.maxHealth = 3 + (this.upgrades.shield - 1) * 1;
        // 如果增加了上限，顺便将血量补满差值
        if (this.maxHealth > oldMax) {
            this.health += (this.maxHealth - oldMax);
        }

        // 3. 射击冷却升级 (每级缩短冷却)
        this.cooldownMax = Math.max(12, 35 - (this.upgrades.fireRate - 1) * 5);
        this.maxAmmo = 3 + Math.floor((this.upgrades.fireRate - 1) / 2);
        this.ammo = this.maxAmmo;
    }

    // 拾取临时增益道具
    applyPowerUp(type) {
        SoundFX.playPowerUp();
        if (type === 'shield') {
            this.shieldTime = 400; // 约6.6秒无敌
            this.invulnerable = true;
        } else if (type === 'repair') {
            this.health = Math.min(this.maxHealth, this.health + 2); // 修复血量
            if (typeof Game !== 'undefined') {
                Game.baseHealth = Math.min(Game.baseMaxHealth, Game.baseHealth + 2); // 修复基地
            }
        } else if (type === 'star') {
            // 临时满弹药并提升射击速度
            this.ammo = this.maxAmmo;
            this.cooldown = 0;
        }
    }

    update(keys, mouseX, mouseY, otherTanks) {
        if (!this.isAlive) return;

        // 1. 冷却计时器与备弹回复
        if (this.cooldown > 0) this.cooldown--;
        
        if (this.ammo < this.maxAmmo) {
            this.ammoRegenTimer++;
            // 基础回复时间: 60帧, 随射速等级提升加快
            const regenTime = Math.max(25, 60 - (this.upgrades.fireRate - 1) * 8);
            if (this.ammoRegenTimer >= regenTime) {
                this.ammo++;
                this.ammoRegenTimer = 0;
            }
        }

        // 2. 更新出生护盾
        if (this.shieldTime > 0) {
            this.shieldTime--;
            this.invulnerable = true;
        } else {
            this.invulnerable = false;
        }

        // 3. 键盘控制运动 (支持8方向移动)
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            // 归一化移动向量，防止对角线移动飞起
            const length = Math.sqrt(dx * dx + dy * dy);
            const moveX = (dx / length) * this.speed;
            const moveY = (dy / length) * this.speed;

            // 车辆转向角度随键盘输入调整
            this.angle = Math.atan2(moveY, moveX);

            // 尝试先水平移动，后垂直移动 (滑动感)
            let newX = this.x + moveX;
            let newY = this.y + moveY;
            
            // 地图碰撞 & 其它坦克碰撞检测
            let blockedX = this.checkMapCollision(newX, this.y) || this.checkTankCollision(newX, this.y, otherTanks);
            let blockedY = this.checkMapCollision(this.x, newY) || this.checkTankCollision(this.x, newY, otherTanks);

            if (!blockedX) this.x = newX;
            if (!blockedY) this.y = newY;

            // 产生履带尘土
            if (Math.random() < 0.15) {
                ParticleSystem.spawnTrack(this.x, this.y, this.angle);
            }
            // 产生蓝色引擎尾气
            if (Math.random() < 0.3) {
                // 喷气口位于坦克正后方，少许偏移
                const rearX = this.x - Math.cos(this.angle) * 16;
                const rearY = this.y - Math.sin(this.angle) * 16;
                ParticleSystem.spawnExhaust(rearX, rearY, this.angle, this.color);
            }
        }

        // 4. 炮塔独立追踪鼠标位置
        const deltaX = mouseX - this.x;
        const deltaY = mouseY - this.y;
        this.turretAngle = Math.atan2(deltaY, deltaX);
    }

    // 玩家坦克与其它敌方坦克的挤压碰撞检测
    checkTankCollision(newX, newY, otherTanks) {
        const myBounds = this.getBounds(newX, newY);
        for (const tank of otherTanks) {
            if (tank === this || !tank.isAlive) continue;
            if (this.rectsOverlap(myBounds, tank.getBounds())) {
                return true;
            }
        }
        return false;
    }

    // 玩家射击逻辑
    shoot() {
        if (this.cooldown > 0 || this.ammo <= 0) return null;

        this.ammo--;
        this.cooldown = this.cooldownMax;
        
        // 炮管口计算 (子弹从炮管前端射出)
        const barrelLen = 22;
        const bulletX = this.x + Math.cos(this.turretAngle) * barrelLen;
        const bulletY = this.y + Math.sin(this.turretAngle) * barrelLen;
        
        // 子弹属性随伤害等级提升
        const bulletSpeed = 5.5 + (this.upgrades.damage - 1) * 0.6;
        const bulletDmg = 1 + (this.upgrades.damage - 1) * 0.5;

        SoundFX.playShoot();
        
        // 枪口火焰粒子
        ParticleSystem.spawnExplosion(bulletX, bulletY, this.color, 5, 2);

        // 如果伤害等级达到 4 级以上，发射双排子弹
        if (this.upgrades.damage >= 4) {
            const sideAngle = 0.12; // 双弹散开角
            return [
                new Bullet(bulletX, bulletY, this.turretAngle - sideAngle, bulletSpeed, bulletDmg, 'player'),
                new Bullet(bulletX, bulletY, this.turretAngle + sideAngle, bulletSpeed, bulletDmg, 'player')
            ];
        }

        // 默认发射单枚电浆子弹
        return [new Bullet(bulletX, bulletY, this.turretAngle, bulletSpeed, bulletDmg, 'player')];
    }

    takeDamage(amount) {
        if (this.invulnerable || !this.isAlive) return;

        // 护盾等级可以减免伤害 (1.0 -> 0.8 -> 0.65)
        const dmgReduction = Math.max(0.4, 1.1 - this.upgrades.shield * 0.15);
        const actualDmg = amount * dmgReduction;

        this.health -= actualDmg;
        ParticleSystem.triggerShake(8, 12);
        
        // 触发屏幕红色受伤边缘闪烁闪屏
        if (typeof Game !== 'undefined') {
            Game.damageFlashTimer = 15;
        }

        // 受伤红光爆炸
        ParticleSystem.spawnExplosion(this.x, this.y, '#ff3333', 10, 3);
        SoundFX.playHit();

        // 临时无敌 0.8 秒防止连续被秒
        this.shieldTime = 48;
        this.invulnerable = true;

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            // 壮烈死亡大爆炸
            ParticleSystem.spawnExplosion(this.x, this.y, '#00f0ff', 40, 7);
            ParticleSystem.spawnExplosion(this.x, this.y, '#ff007f', 30, 5);
            SoundFX.playExplosion();
        }
    }

    draw(ctx) {
        if (!this.isAlive) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. 绘制履带转向车身
        ctx.rotate(this.angle);
        
        ctx.shadowBlur = 4;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1.5;

        // 绘制下盘车身主体 (倒角科技感装甲板)
        const w = 28;
        const h = 26;
        ctx.beginPath();
        ctx.moveTo(-w/2 + 4, -h/2);
        ctx.lineTo(w/2 - 4, -h/2);
        ctx.lineTo(w/2, -h/2 + 4);
        ctx.lineTo(w/2, h/2 - 4);
        ctx.lineTo(w/2 - 4, h/2);
        ctx.lineTo(-w/2 + 4, h/2);
        ctx.lineTo(-w/2, h/2 - 4);
        ctx.lineTo(-w/2, -h/2 + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 绘制左右两侧精致装甲履带
        ctx.fillStyle = '#0f172a';
        // 左履带
        ctx.fillRect(-17, -16, 34, 6);
        ctx.strokeRect(-17, -16, 34, 6);
        // 右履带
        ctx.fillRect(-17, 10, 34, 6);
        ctx.strokeRect(-17, 10, 34, 6);

        // 绘制防滑履带齿细部
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let tx = -14; tx <= 14; tx += 6) {
            ctx.moveTo(tx, -16);
            ctx.lineTo(tx, -10);
            ctx.moveTo(tx, 10);
            ctx.lineTo(tx, 16);
        }
        ctx.stroke();

        // 绘制四个履带负重齿轮
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(-13, -13, 2, 0, Math.PI * 2);
        ctx.arc(13, -13, 2, 0, Math.PI * 2);
        ctx.arc(-13, 13, 2, 0, Math.PI * 2);
        ctx.arc(13, 13, 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制车尾发动机散热网格
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(-10, -5); ctx.lineTo(-10, 5);
        ctx.moveTo(-7, -5); ctx.lineTo(-7, 5);
        ctx.moveTo(-4, -5); ctx.lineTo(-4, 5);
        ctx.stroke();

        // 绘制前大灯 (白色发光)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(12, -7, 1.5, 0, Math.PI * 2);
        ctx.arc(12, 7, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(-this.angle);

        // 2. 绘制独立旋转炮塔
        ctx.rotate(this.turretAngle);

        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;

        // 炮塔双层护甲结构
        ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 炮塔顶盖中央动力堆
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // 炮管根部的方形防盾
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, -4, 4, 8);
        ctx.strokeRect(4, -4, 4, 8);

        // 重装导轨电浆炮管
        ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.fillRect(8, -3, 13, 6);
        ctx.strokeRect(8, -3, 13, 6);

        // 枪口高能聚焦环 (电浆发光)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(21, -4.5, 3, 9);

        // 后置通信天线
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-17, -4);
        ctx.stroke();
        
        // 天线顶端信号灯
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(-17, -4, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(-this.turretAngle);

        // 3. 绘制无敌护盾圈
        if (this.invulnerable) {
            const shieldPulse = Math.sin(Date.now() * 0.01) * 3;
            ctx.shadowBlur = 10 + shieldPulse;
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 26 + shieldPulse, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ==========================================
// 敌方坦克类
// ==========================================
class EnemyTank extends BaseTank {
    constructor(x, y, type) {
        let speed, maxHealth, color, size, scoreValue;
        
        switch (type) {
            case 'scout': // 侦察车 (绿色, 速度快, 血少)
                speed = 3.2; maxHealth = 1; color = '#39ff14'; size = 32; scoreValue = 200;
                break;
            case 'heavy': // 重装坦克 (橙色, 速度慢, 血多)
                speed = 1.6; maxHealth = 4; color = '#ffb700'; size = 38; scoreValue = 400;
                break;
            case 'boss':  // Boss 级坦克 (紫色, 破坏性大, 血极厚)
                speed = 1.2; maxHealth = 10; color = '#a855f7'; size = 44; scoreValue = 1000;
                break;
            case 'normal':
            default:      // 普通型 (粉色, 平衡)
                speed = 2.2; maxHealth = 2; color = '#ff007f'; size = 34; scoreValue = 100;
                break;
        }

        super(x, y, speed, maxHealth, color, size);
        this.type = type;
        this.scoreValue = scoreValue;
        
        this.aiDecisionTimer = 0;
        this.shootTimer = Math.random() * 40; // 随机初始化，避免敌人同时开火
        
        // 4方向移动逻辑, 0:上, 1:右, 2:下, 3:left
        this.moveDir = 2; // 默认向下移动
        this.setAngleFromDir();
        this.dirChangeCooldown = 0; // 转向冷却，防止卡死在墙角时原地高频打转闪烁

        // 随着关卡难度增加，小幅提升敌人移动速度，增加后期压迫感与攻击力
        let levelIndex = 0;
        if (typeof Game !== 'undefined') {
            levelIndex = Game.currentMode === 'campaign' ? Game.currentLevelIndex : Game.survivalWave - 1;
        }
        this.speed = speed * (1 + levelIndex * 0.05); // 每升一级速度提升 5% (关卡 5 提升 20%)
    }

    setAngleFromDir() {
        switch (this.moveDir) {
            case 0: this.angle = -Math.PI / 2; break; // 上
            case 1: this.angle = 0; break;             // 右
            case 2: this.angle = Math.PI / 2; break;  // 下
            case 3: this.angle = Math.PI; break;       // 左
        }
    }

    update(playerX, playerY, baseRow, baseCol, allTanks) {
        if (!this.isAlive) return;

        // 递减转向冷却计时器
        if (this.dirChangeCooldown > 0) {
            this.dirChangeCooldown--;
        }

        // 1. 自动移动逻辑 (寻找玩家或基地)
        this.aiDecisionTimer++;
        
        // 计算预期的前进一步
        let vx = 0;
        let vy = 0;
        switch (this.moveDir) {
            case 0: vy = -this.speed; break;
            case 1: vx = this.speed; break;
            case 2: vy = this.speed; break;
            case 3: vx = -this.speed; break;
        }

        const nextX = this.x + vx;
        const nextY = this.y + vy;
        
        // 检测碰撞 (是否碰墙或碰到其它坦克)
        const isBlocked = this.checkMapCollision(nextX, nextY) || this.checkTankCollision(nextX, nextY, allTanks);

        // 缩短决策冷却：每 40 帧 (约0.67s) 重新做一次寻路决策，提升反应灵敏度
        const shouldDecide = this.aiDecisionTimer >= 40;
        const canDecide = (this.dirChangeCooldown <= 0);

        if ((shouldDecide || isBlocked) && canDecide) {
            this.aiDecisionTimer = 0;
            this.chooseNewDirection(playerX, playerY, baseRow, baseCol, allTanks);
        } else if (!isBlocked) {
            // 无碰撞，正常向前移动
            this.x = nextX;
            this.y = nextY;
            
            // 产生尾气和履带
            if (Math.random() < 0.1) {
                ParticleSystem.spawnTrack(this.x, this.y, this.angle);
            }
            if (Math.random() < 0.2) {
                const rearX = this.x - Math.cos(this.angle) * (this.size / 2);
                const rearY = this.y - Math.sin(this.angle) * (this.size / 2);
                ParticleSystem.spawnExhaust(rearX, rearY, this.angle, this.color);
            }
        } else {
            // 被阻挡且在冷却期，原地不动，等待开火或冷却结束，累计决策时间
            this.aiDecisionTimer++;
        }

        // 2. 自动射击及“面墙破甲”开火逻辑
        this.shootTimer++;
        
        let levelIndex = 0;
        if (typeof Game !== 'undefined') {
            levelIndex = Game.currentMode === 'campaign' ? Game.currentLevelIndex : Game.survivalWave - 1;
        }
        
        // 射击间隔缩短系数
        const speedFactor = Math.min(0.4, levelIndex * 0.08); 
        const shootInterval = Math.max(20, Math.floor((this.type === 'boss' ? 45 : (this.type === 'heavy' ? 70 : 100)) * (1 - speedFactor)));

        // “破墙行为”：探测车头前方 24px (大于坦克半径 17px) 处是否有可摧毁的砖墙
        let isFrontBrick = false;
        let testX = this.x;
        let testY = this.y;
        const testDist = 24;
        if (this.moveDir === 0) testY -= testDist;
        else if (this.moveDir === 1) testX += testDist;
        else if (this.moveDir === 2) testY += testDist;
        else if (this.moveDir === 3) testX -= testDist;

        const testRow = Math.floor(testY / GameMap.TILE_SIZE);
        const testCol = Math.floor(testX / GameMap.TILE_SIZE);
        if (testRow >= 0 && testRow < GameMap.ROWS && testCol >= 0 && testCol < GameMap.COLS) {
            if (GameMap.currentGrid[testRow][testCol] === GameMap.TILE_BRICK) {
                isFrontBrick = true;
            }
        }

        if (this.shootTimer >= shootInterval) {
            this.shootTimer = 0;
            if (isFrontBrick) {
                // 如果正前方是砖墙，100%开火破墙，打通路线
                return this.shoot();
            } else {
                // 否则，根据关卡难度比例概率性开火攻击玩家/基地
                const shootChance = Math.min(0.9, 0.55 + levelIndex * 0.08);
                if (Math.random() < shootChance) {
                    return this.shoot();
                }
            }
        } else if (isFrontBrick && this.shootTimer === Math.floor(shootInterval / 2)) {
            // 加速破墙：如果CD走了一半且前方是砖墙，有 60% 概率提前开炮
            if (Math.random() < 0.6) {
                this.shootTimer = 0;
                return this.shoot();
            }
        }
        return null;
    }

    // 敌人坦克挤压碰撞检测
    checkTankCollision(newX, newY, allTanks) {
        const myBounds = this.getBounds(newX, newY);
        for (const tank of allTanks) {
            if (tank === this || !tank.isAlive) continue;
            if (this.rectsOverlap(myBounds, tank.getBounds())) {
                return true;
            }
        }
        return false;
    }

    // BFS 寻路查找通往目标网格的下一步运动方向 (0:上, 1:右, 2:下, 3:左, -1:无路)
    findNextDirBFS(targetRow, targetCol) {
        const startRow = Math.floor(this.y / GameMap.TILE_SIZE);
        const startCol = Math.floor(this.x / GameMap.TILE_SIZE);
        
        if (startRow === targetRow && startCol === targetCol) {
            return -1;
        }
        
        // BFS 1: 优先寻找一条完全畅通的路径（避开钢墙、水域、砖墙、基地）
        let dir = this.bfsSearch(startRow, startCol, targetRow, targetCol, false);
        if (dir !== -1) return dir;
        
        // BFS 2: 如果找不到畅通路径，则寻找可通过击碎砖墙达到的路径（只避开钢墙、水域、基地）
        dir = this.bfsSearch(startRow, startCol, targetRow, targetCol, true);
        return dir;
    }

    bfsSearch(startRow, startCol, targetRow, targetCol, allowBricks) {
        const queue = [];
        const visited = Array(GameMap.ROWS).fill(null).map(() => Array(GameMap.COLS).fill(false));
        visited[startRow][startCol] = true;
        
        // 初始化起点周围的四个邻居作为首步
        const dirs = [
            { r: startRow - 1, c: startCol, d: 0 },
            { r: startRow, c: startCol + 1, d: 1 },
            { r: startRow + 1, c: startCol, d: 2 },
            { r: startRow, c: startCol - 1, d: 3 }
        ];

        for (const n of dirs) {
            if (n.r >= 0 && n.r < GameMap.ROWS && n.c >= 0 && n.c < GameMap.COLS) {
                let blocked = false;
                if (n.r === targetRow && n.c === targetCol) {
                    blocked = false; // 终点自身不做阻挡校验，确保邻接目标时可达
                } else {
                    const val = GameMap.currentGrid[n.r][n.c];
                    blocked = (val === GameMap.TILE_STEEL || val === GameMap.TILE_WATER || val === GameMap.TILE_BASE);
                    if (val === GameMap.TILE_BRICK) {
                        blocked = !allowBricks;
                    }
                }
                
                if (!blocked) {
                    visited[n.r][n.c] = true;
                    queue.push([n.r, n.c, n.d]);
                }
            }
        }

        let head = 0;
        while (head < queue.length) {
            const [r, c, firstDir] = queue[head++];
            
            if (r === targetRow && c === targetCol) {
                return firstDir;
            }
            
            const neighbors = [
                { r: r - 1, c: c, d: 0 },
                { r: r, c: c + 1, d: 1 },
                { r: r + 1, c: c, d: 2 },
                { r: r, c: c - 1, d: 3 }
            ];
            
            for (const n of neighbors) {
                if (n.r >= 0 && n.r < GameMap.ROWS && n.c >= 0 && n.c < GameMap.COLS) {
                    if (!visited[n.r][n.c]) {
                        let blocked = false;
                        if (n.r === targetRow && n.c === targetCol) {
                            blocked = false;
                        } else {
                            const val = GameMap.currentGrid[n.r][n.c];
                            blocked = (val === GameMap.TILE_STEEL || val === GameMap.TILE_WATER || val === GameMap.TILE_BASE);
                            if (val === GameMap.TILE_BRICK) {
                                blocked = !allowBricks;
                            }
                        }
                        
                        if (!blocked) {
                            visited[n.r][n.c] = true;
                            queue.push([n.r, n.c, firstDir]);
                        }
                    }
                }
            }
        }
        return -1;
    }

    // AI 决策新朝向：倾向于锁定总部基地或玩家坦克，随着关卡往后攻击欲望与专注性高强度攀升
    chooseNewDirection(playerX, playerY, baseRow, baseCol, allTanks) {
        let levelIndex = 0;
        if (typeof Game !== 'undefined') {
            levelIndex = Game.currentMode === 'campaign' ? Game.currentLevelIndex : Game.survivalWave - 1;
        }

        // 决策核心：难度越高，越倾向于锁定总部；低关卡更倾向于随机巡逻或纠缠玩家
        let targetRow = baseRow;
        let targetCol = baseCol;

        const rand = Math.random();
        
        // 随机巡逻概率：Level 1 为 25%，Level 5+ 仅为 2%
        const patrolChance = Math.max(0.02, 0.25 - levelIndex * 0.06);
        // 直接攻击总部基地概率：Level 1 为 35%，Level 5+ 攀升至 78%
        const baseChance = Math.min(0.78, 0.35 + levelIndex * 0.09);

        if (rand < patrolChance) {
            // 巡逻模式：随机在地图选一个格子作为目标寻路
            targetRow = Math.floor(Math.random() * GameMap.ROWS);
            targetCol = Math.floor(Math.random() * GameMap.COLS);
        } else if (rand < patrolChance + baseChance) {
            // 锁定总部基地
            targetRow = baseRow;
            targetCol = baseCol;
        } else {
            // 锁定玩家坐标
            targetRow = Math.floor(playerY / GameMap.TILE_SIZE);
            targetCol = Math.floor(playerX / GameMap.TILE_SIZE);
        }

        // 使用 BFS 快速寻路求得下一步移动方向
        let chosenDir = this.findNextDirBFS(targetRow, targetCol);

        // 降级退化机制：若 BFS 找不到任何合理路径，则退回到四周查找可用空单元
        if (chosenDir === -1) {
            const dirScores = [
                { dir: 0, dx: 0, dy: -1 },
                { dir: 1, dx: 1, dy: 0 },
                { dir: 2, dx: 0, dy: 1 },
                { dir: 3, dx: -1, dy: 0 }
            ];
            // 打乱顺序避免固定死角打转
            dirScores.sort(() => Math.random() - 0.5);
            
            const testDist = 22; // 略微大于坦克半径
            for (const entry of dirScores) {
                let testX = this.x + entry.dx * testDist;
                let testY = this.y + entry.dy * testDist;
                const isBlocked = this.checkMapCollision(testX, testY) || this.checkTankCollision(testX, testY, allTanks);
                if (!isBlocked) {
                    chosenDir = entry.dir;
                    break;
                }
            }
        }

        if (chosenDir !== -1) {
            this.moveDir = chosenDir;
            this.setAngleFromDir();
            // 重置转向冷却，AI 可以进行更敏捷的调整
            this.dirChangeCooldown = 10; 
        } else {
            // 四向全部封死，停止打转纠结，原地站稳 20 帧等待环境变化（或等待破甲炮开火）
            this.dirChangeCooldown = 20;
        }
    }

    shoot() {
        const barrelLen = this.size / 2 + 3;
        const bulletX = this.x + Math.cos(this.angle) * barrelLen;
        const bulletY = this.y + Math.sin(this.angle) * barrelLen;
        
        // 敌人子弹速度
        const bulletSpeed = this.type === 'scout' ? 6.0 : (this.type === 'heavy' ? 3.5 : 4.5);
        const bulletDmg = this.type === 'heavy' ? 1.5 : 1;

        // 闪光
        ParticleSystem.spawnExplosion(bulletX, bulletY, this.color, 4, 1.5);

        if (this.type === 'boss') {
            // Boss发射平行的双排子弹
            const offsetDist = 8;
            const perpAngle = this.angle + Math.PI / 2;
            const xOffset = Math.cos(perpAngle) * offsetDist;
            const yOffset = Math.sin(perpAngle) * offsetDist;
            return [
                new Bullet(bulletX + xOffset, bulletY + yOffset, this.angle, bulletSpeed, 1, 'enemy'),
                new Bullet(bulletX - xOffset, bulletY - yOffset, this.angle, bulletSpeed, 1, 'enemy')
            ];
        }

        return [new Bullet(bulletX, bulletY, this.angle, bulletSpeed, bulletDmg, 'enemy')];
    }

    takeDamage(amount) {
        if (!this.isAlive) return;

        this.health -= amount;
        SoundFX.playHit();
        ParticleSystem.spawnExplosion(this.x, this.y, '#ffffff', 8, 3);

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            
            // 阵亡大爆炸
            ParticleSystem.spawnExplosion(this.x, this.y, this.color, 25, 4.5);
            SoundFX.playExplosion();
            
            // Boss阵亡时引发屏幕剧烈抖动和连环闪光
            if (this.type === 'boss') {
                ParticleSystem.triggerShake(15, 30);
                setTimeout(() => ParticleSystem.spawnExplosion(this.x + 15, this.y - 15, '#a855f7', 15, 3), 150);
                setTimeout(() => ParticleSystem.spawnExplosion(this.x - 15, this.y + 15, '#00f0ff', 15, 3), 300);
            } else {
                ParticleSystem.triggerShake(4, 8);
            }
        }
    }

    draw(ctx) {
        if (!this.isAlive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;

        // 根据类型绘制高度精细化的霓虹科幻敌军装甲
        if (this.type === 'scout') {
            // 1. 侦察坦克 (绿色轻型悬浮战机)：流线型侧翼，双排小型推进器，极具动感
            ctx.fillStyle = 'rgba(57, 255, 20, 0.08)';
            
            // 流线型机甲核心
            ctx.beginPath();
            ctx.moveTo(-14, -10);
            ctx.lineTo(8, -12);
            ctx.lineTo(14, 0);
            ctx.lineTo(8, 12);
            ctx.lineTo(-14, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 侧翼稳定悬浮翼板
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-8, -15, 12, 3);
            ctx.strokeRect(-8, -15, 12, 3);
            ctx.fillRect(-8, 12, 12, 3);
            ctx.strokeRect(-8, 12, 12, 3);

            // 尾部推进器喷口
            ctx.fillStyle = this.color;
            ctx.fillRect(-16, -5, 2, 4);
            ctx.fillRect(-16, 1, 2, 4);

            // 战机头部超导体前扫天线
            ctx.strokeStyle = 'rgba(57, 255, 20, 0.7)';
            ctx.beginPath();
            ctx.moveTo(14, -4); ctx.lineTo(19, -4);
            ctx.moveTo(14, 4); ctx.lineTo(19, 4);
            ctx.stroke();

            // 顶端轻质圆柱旋转炮塔
            ctx.fillStyle = 'rgba(57, 255, 20, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 细长高频离子炮管
            ctx.fillStyle = this.color;
            ctx.fillRect(5, -1.5, 11, 3);
        } 
        else if (this.type === 'heavy') {
            // 2. 重装坦克 (金色重型攻城要塞)：宽厚箱体、重履带与前后散热排气管道
            ctx.fillStyle = 'rgba(255, 183, 0, 0.08)';
            
            // 宽大敦实的重装底座车壳 (凹凸板甲结构)
            ctx.beginPath();
            ctx.moveTo(-16, -15);
            ctx.lineTo(10, -15);
            ctx.lineTo(16, -10);
            ctx.lineTo(16, 10);
            ctx.lineTo(10, 15);
            ctx.lineTo(-16, 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 双列大型履带组件
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-18, -19, 36, 5);
            ctx.strokeRect(-18, -19, 36, 5);
            ctx.fillRect(-18, 14, 36, 5);
            ctx.strokeRect(-18, 14, 36, 5);

            // 履带防滑纹路与咬合齿
            ctx.strokeStyle = 'rgba(255, 183, 0, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let tx = -15; tx <= 15; tx += 5) {
                ctx.moveTo(tx, -19); ctx.lineTo(tx, -14);
                ctx.moveTo(tx, 14); ctx.lineTo(tx, 19);
            }
            ctx.stroke();

            // 双引擎通风冷却风扇 (背部同心圆)
            ctx.fillStyle = 'rgba(255, 183, 0, 0.15)';
            ctx.beginPath();
            ctx.arc(-8, -6, 4, 0, Math.PI * 2);
            ctx.arc(-8, 6, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 风扇中点
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(-8, -6, 1.2, 0, Math.PI * 2);
            ctx.arc(-8, 6, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // 前置厚装甲防弹斜角块
            ctx.fillStyle = this.color;
            ctx.fillRect(10, -11, 4, 22);

            // 粗壮炮塔
            ctx.fillStyle = 'rgba(255, 183, 0, 0.22)';
            ctx.beginPath();
            ctx.arc(2, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 重型多膛加农炮管 (高伤害)
            ctx.fillStyle = this.color;
            ctx.fillRect(10, -3.5, 14, 7);
            ctx.strokeRect(10, -3.5, 14, 7);
            
            // 炮口制退器结构
            ctx.fillStyle = '#fff';
            ctx.fillRect(23, -5, 3, 10);
        }
        else if (this.type === 'boss') {
            // 3. Boss级坦克 (紫色巨型机甲移动堡垒)：多轨驱动，四排天线，双联主炮
            ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
            
            // 绘制巨大的厚实多边形指挥堡垒底盘
            const r = this.size / 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i;
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 四组独立重装防滑履带包 (分布在车底盘四周角上)
            ctx.fillStyle = '#0a0d1a';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            // 前左
            ctx.fillRect(6, -21, 14, 4); ctx.strokeRect(6, -21, 14, 4);
            // 后左
            ctx.fillRect(-20, -21, 14, 4); ctx.strokeRect(-20, -21, 14, 4);
            // 前右
            ctx.fillRect(6, 17, 14, 4); ctx.strokeRect(6, 17, 14, 4);
            // 后右
            ctx.fillRect(-20, 17, 14, 4); ctx.strokeRect(-20, 17, 14, 4);

            // 履带的防滑卡扣
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
            ctx.beginPath();
            for (let tx = -18; tx <= -8; tx += 4) {
                ctx.moveTo(tx, -21); ctx.lineTo(tx, -17);
                ctx.moveTo(tx, 17); ctx.lineTo(tx, 21);
            }
            for (let tx = 8; tx <= 18; tx += 4) {
                ctx.moveTo(tx, -21); ctx.lineTo(tx, -17);
                ctx.moveTo(tx, 17); ctx.lineTo(tx, 21);
            }
            ctx.stroke();

            // 双发电机尾气排气筒 (车尾斜向排管)
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-15, -8); ctx.lineTo(-21, -11);
            ctx.moveTo(-15, 8); ctx.lineTo(-21, 11);
            ctx.stroke();

            // 超重型中央战术指挥中心炮台
            ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
            ctx.beginPath();
            ctx.arc(-2, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.color;
            ctx.stroke();

            // 炮塔上的雷达反射面 (精致弧线)
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-8, 0, 4, -Math.PI/3, Math.PI/3);
            ctx.stroke();

            // 双联重力磁轨高能加农主炮
            ctx.fillStyle = this.color;
            ctx.fillRect(10, -8, 16, 5);
            ctx.strokeRect(10, -8, 16, 5);
            ctx.fillRect(10, 3, 16, 5);
            ctx.strokeRect(10, 3, 16, 5);

            // 双炮口粒子加速线圈 (白色核心发光)
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.fillRect(25, -9, 3, 7);
            ctx.fillRect(25, 2, 3, 7);
        }
        else {
            // 4. 普通型坦克 (粉色多功能基础装甲车)：经典带轮履带、车身焊线板、圆形单管炮
            ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
            
            // 结实利落的六角车底盘
            ctx.beginPath();
            ctx.moveTo(-14, -12);
            ctx.lineTo(8, -12);
            ctx.lineTo(14, -8);
            ctx.lineTo(14, 8);
            ctx.lineTo(8, 12);
            ctx.lineTo(-14, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 两侧防护裙边履带板
            ctx.fillStyle = '#0d0f1a';
            ctx.fillRect(-16, -15, 32, 4);
            ctx.strokeRect(-16, -15, 32, 4);
            ctx.fillRect(-16, 11, 32, 4);
            ctx.strokeRect(-16, 11, 32, 4);

            // 履带板防滑钉
            ctx.strokeStyle = 'rgba(255, 0, 127, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let tx = -12; tx <= 12; tx += 6) {
                ctx.moveTo(tx, -15); ctx.lineTo(tx, -11);
                ctx.moveTo(tx, 11); ctx.lineTo(tx, 15);
            }
            ctx.stroke();

            // 顶端旋转加固炮盘
            ctx.fillStyle = 'rgba(255, 0, 127, 0.22)';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 单管聚焦等离子炮
            ctx.fillStyle = this.color;
            ctx.fillRect(7, -2.5, 12, 5);
            ctx.strokeRect(7, -2.5, 12, 5);
            
            // 炮口能量稳流嘴
            ctx.fillStyle = '#fff';
            ctx.fillRect(18, -3.5, 2, 7);
        }

        ctx.restore();

        // 4. 绘制敌军血条 (如果被打过，显示在上方)
        if (this.health < this.maxHealth) {
            const barW = this.size;
            const barH = 3;
            const barX = this.x - barW / 2;
            const barY = this.y - this.size / 2 - 8;

            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), barH);
            ctx.restore();
        }
    }
}
