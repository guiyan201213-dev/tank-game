/* ==========================================
   NEON TANK BUSTERS AUDIO SYNTHESIZER (WEB AUDIO API)
   ========================================== */

const SoundFX = {
    ctx: null,
    muted: false,

    init() {
        if (this.ctx) return;
        try {
            // 兼容性写法创建 AudioContext
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    },

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    // 播放子弹发射音效：频率高频滑落 (1200Hz -> 100Hz)
    playShoot() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    },

    // 播放击中墙壁音效：短促的金属撞击声
    playHit() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(300, now + 0.04);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    },

    // 播放爆炸音效：使用白噪声和低通滤波器模拟震动
    playExplosion() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.45; // 0.45秒长度
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // 生成白噪声
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // 使用低通滤波器使爆炸低沉
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(20, now + 0.4);

        // 音量包络线
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.45);
    },

    // 播放拾取道具音效：上升的琶音 (C4 -> E4 -> G4 -> C5)
    playPowerUp() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        const noteDuration = 0.07;

        frequencies.forEach((freq, idx) => {
            const noteTime = now + (idx * noteDuration);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);

            gain.gain.setValueAtTime(0.1, noteTime);
            gain.gain.linearRampToValueAtTime(0.001, noteTime + noteDuration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(noteTime);
            osc.stop(noteTime + noteDuration);
        });
    },

    // 游戏结束音效：缓慢降频的悲壮和弦
    playGameOver() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(60, now + 1.2);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
    },

    // 通关成功音效：胜利的激昂曲调
    playVictory() {
        this.resume();
        if (this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        const melody = [
            { note: 261.63, time: 0 },    // C4
            { note: 329.63, time: 0.12 },  // E4
            { note: 392.00, time: 0.24 },  // G4
            { note: 523.25, time: 0.36 },  // C5
            { note: 392.00, time: 0.48 },  // G4
            { note: 523.25, time: 0.60 }   // C5
        ];

        melody.forEach(item => {
            const noteTime = now + item.time;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(item.note, noteTime);

            gain.gain.setValueAtTime(0.08, noteTime);
            gain.gain.linearRampToValueAtTime(0.001, noteTime + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(noteTime);
            osc.stop(noteTime + 0.25);
        });
    }
};
