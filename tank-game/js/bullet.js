/* ==========================================
   NEON TANK BUSTERS BULLET CLASS
   ========================================== */

class Bullet {
    constructor(x, y, angle, speed, damage, ownerType) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.ownerType = ownerType; // 'player' 或 'enemy'
        this.radius = 4;
        this.isAlive = true;
    }

    update() {
        if (!this.isAlive) return;

        // 前进移动
        this.x += this.vx;
        this.y += this.vy;

        // 越界检查
        const limit = 800; // 地图宽高
        if (this.x < 0 || this.x > limit || this.y < 0 || this.y > limit) {
            this.isAlive = false;
            // 越界产生少量火花
            ParticleSystem.spawnExplosion(
                Math.max(0, Math.min(limit, this.x)),
                Math.max(0, Math.min(limit, this.y)),
                this.ownerType === 'player' ? '#00f0ff' : '#ff007f',
                5,
                2
            );
            return;
        }

        // 网格碰撞检测
        const col = Math.floor(this.x / GameMap.TILE_SIZE);
        const row = Math.floor(this.y / GameMap.TILE_SIZE);

        if (GameMap.isBulletBlocked(row, col)) {
            this.isAlive = false;
            this.handleWallCollision(row, col);
        }
    }

    // 处理子弹与墙体/基地的碰撞
    handleWallCollision(row, col) {
        const val = GameMap.currentGrid[row][col];
        const hitX = this.x;
        const hitY = this.y;

        if (val === GameMap.TILE_BRICK) {
            // 打中砖墙
            const destroyed = GameMap.damageBrick(row, col, 1);
            SoundFX.playHit();
            
            // 产生橙色灰土火花
            ParticleSystem.spawnExplosion(hitX, hitY, '#f97316', destroyed ? 12 : 6, 3);
            
            // 微震动
            if (this.ownerType === 'player') {
                ParticleSystem.triggerShake(2, 4);
            }
        } else if (val === GameMap.TILE_STEEL) {
            // 打中钢墙：不可摧毁，仅溅射青色合金火花
            SoundFX.playHit();
            ParticleSystem.spawnExplosion(hitX, hitY, '#06b6d4', 8, 4);
        } else if (val === GameMap.TILE_BASE) {
            // 打中基地！
            this.isAlive = false;
            // 基地受损在 game.js 的全局循环中，这里广播伤害逻辑或触发事件
            if (typeof Game !== 'undefined') {
                Game.damageBase(this.damage);
            }
        }
    }

    draw(ctx) {
        if (!this.isAlive) return;

        ctx.save();
        ctx.beginPath();
        
        // 区分玩家和敌人子弹颜色
        if (this.ownerType === 'player') {
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f0ff';
            ctx.fillStyle = '#00f0ff';
        } else {
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff007f';
            ctx.fillStyle = '#ff007f';
        }

        // 绘制子弹核心
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制白色亮核，增强高能量质感
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
