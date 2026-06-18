/* ==========================================
   NEON TANK BUSTERS PARTICLE SYSTEM & SCREEN SHAKE
   ========================================== */

const ParticleSystem = {
    sparks: [],
    tracks: [],
    exhausts: [],

    // 屏幕抖动配置
    shakeTime: 0,
    shakeIntensity: 0,
    shakeX: 0,
    shakeY: 0,

    // 触发屏幕震动
    triggerShake(intensity, durationFrames) {
        this.shakeIntensity = intensity;
        this.shakeTime = durationFrames;
    },

    // 更新屏幕震动偏移
    updateShake() {
        if (this.shakeTime > 0) {
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeTime--;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    },

    // 产生火花/碎片爆炸粒子
    spawnExplosion(x, y, color = '#ff007f', count = 20, maxSpeed = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * maxSpeed;
            this.sparks.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 3 + Math.random() * 4,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                glow: 10 + Math.random() * 10
            });
        }
    },

    // 产生闪烁的喷气尾气粒子
    spawnExhaust(x, y, angle, color = '#00f0ff') {
        const backAngle = angle + Math.PI; // 向坦克正后方喷射
        const spreadAngle = backAngle + (Math.random() - 0.5) * 0.4; // 少许散布
        const speed = 1 + Math.random() * 1.5;
        this.exhausts.push({
            x: x,
            y: y,
            vx: Math.cos(spreadAngle) * speed,
            vy: Math.sin(spreadAngle) * speed,
            color: color,
            size: 4 + Math.random() * 3,
            alpha: 0.8,
            decay: 0.04
        });
    },

    // 产生坦克履带印痕
    spawnTrack(x, y, angle) {
        this.tracks.push({
            x: x,
            y: y,
            angle: angle,
            alpha: 0.5,
            decay: 0.003 // 缓慢退场，持续长一点
        });
    },

    // 全局重置粒子
    clearAll() {
        this.sparks = [];
        this.tracks = [];
        this.exhausts = [];
        this.shakeTime = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    },

    // 更新粒子物理状态
    update() {
        this.updateShake();

        // 1. 更新火花
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const p = this.sparks[i];
            p.x += p.vx;
            p.y += p.vy;
            // 阻力衰减
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.alpha -= p.decay;
            p.size -= 0.05;
            if (p.alpha <= 0 || p.size <= 0) {
                this.sparks.splice(i, 1);
            }
        }

        // 2. 更新尾气
        for (let i = this.exhausts.length - 1; i >= 0; i--) {
            const p = this.exhausts[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            p.size -= 0.1;
            if (p.alpha <= 0 || p.size <= 0) {
                this.exhausts.splice(i, 1);
            }
        }

        // 3. 更新痕迹
        for (let i = this.tracks.length - 1; i >= 0; i--) {
            const p = this.tracks[i];
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.tracks.splice(i, 1);
            }
        }
    },

    // 绘制履带层（在最底层绘制，避免覆盖障碍物或坦克）
    drawTracks(ctx) {
        ctx.save();
        for (const t of this.tracks) {
            ctx.globalAlpha = t.alpha;
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);

            // 绘制左右两条小折线履带印
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 4;
            
            ctx.beginPath();
            // 左侧履带
            ctx.moveTo(-10, -14);
            ctx.lineTo(10, -14);
            // 右侧履带
            ctx.moveTo(-10, 14);
            ctx.lineTo(10, 14);
            ctx.stroke();

            ctx.rotate(-t.angle);
            ctx.translate(-t.x, -t.y);
        }
        ctx.restore();
    },

    // 绘制上层发光粒子层 (在最顶层绘制)
    drawParticles(ctx) {
        ctx.save();
        
        // 1. 绘制喷气尾气 (无发光，半透明青色)
        for (const p of this.exhausts) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. 绘制发光火花/爆炸碎片
        for (const p of this.sparks) {
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = p.glow;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // 画更亮的白色内核
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
};
