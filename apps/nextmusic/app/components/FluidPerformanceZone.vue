<template>
  <div 
    ref="container"
    class="relative w-full h-full bg-black overflow-hidden touch-none select-none cursor-none"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <canvas ref="canvas" class="w-full h-full"></canvas>
    
    <!-- 极简提示 -->
    <div class="absolute bottom-6 right-6 pointer-events-none text-blue-500/40 font-mono text-[10px] tracking-widest uppercase">
      Fluid Performance Zone | {{ currentScale }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { type InputData, type Event } from '@netxmusic/core';

const props = defineProps<{
  currentScale: string;
  styleDna: string;
  sessionId: string;
  externalEvents?: InputData | null;
}>();

const emit = defineEmits<{
  (e: 'input', data: InputData): void;
}>();

// --- 常量与配置 ---
const GRAVITY_BALLS_COUNT = 5;
const PARTICLE_LIFE_DECAY = 0.015;
const SOFT_ADAPT_THRESHOLD = 0.15; // 软吸附阈值

// --- 状态变量 ---
const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;

// 引力球定义
interface GravityBall {
  x: number;
  y: number;
  baseNote: number;
  radius: number;
  color: string;
  pulse: number;
}

const gravityBalls: GravityBall[] = [
  { x: 0.5, y: 0.5, baseNote: 60, radius: 80, color: 'rgba(59, 130, 246, 0.2)', pulse: 0 }, // 中心根音
  { x: 0.2, y: 0.3, baseNote: 48, radius: 60, color: 'rgba(16, 185, 129, 0.15)', pulse: 0 },
  { x: 0.8, y: 0.3, baseNote: 72, radius: 60, color: 'rgba(249, 115, 22, 0.15)', pulse: 0 },
  { x: 0.3, y: 0.8, baseNote: 55, radius: 70, color: 'rgba(139, 92, 246, 0.15)', pulse: 0 },
  { x: 0.7, y: 0.8, baseNote: 67, radius: 70, color: 'rgba(236, 72, 153, 0.15)', pulse: 0 },
];

// 粒子系统
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}
const particles: Particle[] = [];

// 活跃的流
interface Stream {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pressure: number;
  energy: number;
  active: boolean;
  isExternal?: boolean;
  startTime: number;
}
const activeStreams = new Map<string, Stream>();

// --- 生命周期 ---
onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    render();
  }
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', resizeCanvas);
  activeStreams.clear();
  particles.length = 0;
  ctx = null;
});

const resizeCanvas = () => {
  if (canvas.value && container.value) {
    const rect = container.value.getBoundingClientRect();
    canvas.value.width = rect.width * window.devicePixelRatio;
    canvas.value.height = rect.height * window.devicePixelRatio;
    if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
};

// --- 输入处理 ---
const handlePointerDown = (e: PointerEvent) => {
  const rect = container.value?.getBoundingClientRect();
  if (!rect) return;

  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const id = `stream-${e.pointerId}`;
  
  const stream: Stream = {
    id, x, y, prevX: x, prevY: y,
    pressure: e.pressure || 0.5,
    energy: 0.5,
    active: true,
    startTime: Date.now()
  };
  
  activeStreams.set(id, stream);
  processAndEmit(stream, 'active');
};

const handlePointerMove = (e: PointerEvent) => {
  const id = `stream-${e.pointerId}`;
  const stream = activeStreams.get(id);
  if (!stream) return;

  const rect = container.value?.getBoundingClientRect();
  if (!rect) return;

  stream.prevX = stream.x;
  stream.prevY = stream.y;
  stream.x = (e.clientX - rect.left) / rect.width;
  stream.y = (e.clientY - rect.top) / rect.height;
  stream.pressure = e.pressure || 0.5;
  
  // 速度感知映射到 energy
  const dx = stream.x - stream.prevX;
  const dy = stream.y - stream.prevY;
  const velocity = Math.sqrt(dx * dx + dy * dy) * 50; // 缩放系数
  stream.energy = Math.min(1, 0.2 + velocity);

  createParticles(stream);
  processAndEmit(stream, 'active');
};

const handlePointerUp = (e: PointerEvent) => {
  const id = `stream-${e.pointerId}`;
  const stream = activeStreams.get(id);
  if (!stream) return;

  stream.active = false;
  processAndEmit(stream, 'end');
  activeStreams.delete(id);
};

// --- 核心逻辑：输入映射与自由度保护 ---
const processAndEmit = (stream: Stream, state: 'active' | 'end') => {
  // 1. 寻找最近的引力球
  let minDistance = Infinity;
  let nearestBall = gravityBalls[0];

  gravityBalls.forEach(ball => {
    const dist = Math.sqrt(Math.pow(stream.x - ball.x, 2) + Math.pow(stream.y - ball.y, 2));
    if (dist < minDistance) {
      minDistance = dist;
      nearestBall = ball;
    }
  });

  // 2. 距离决定 base_note 和 micro_offset (软吸附算法)
  const baseNote = nearestBall.baseNote;
  // 距离越近，micro_offset 越趋向于 0（吸附）；距离越远，允许更多偏移
  // 如果在两个球之间徘徊，minDistance 会较大，产生连续的频率流
  let microOffset = (minDistance > SOFT_ADAPT_THRESHOLD) 
    ? (stream.x - nearestBall.x) * 1200 // 允许跨度较大的微音程
    : (stream.x - nearestBall.x) * 400; // 吸附区域内较小的偏移

  // 3. Y 轴映射到 StyleResolver 参数（通过 payload 传递）
  // 4. 停留时间触发持续性采样意图
  const duration = Date.now() - stream.startTime;
  const vibratoDepth = duration > 1000 ? Math.min(1, (duration - 1000) / 2000) : 0;

  const nmef: InputData = {
    header: {
      version: "3.0-fluid-zone",
      timestamp: Date.now(),
      session_id: props.sessionId,
      global_context: { scale: props.currentScale, style_dna: props.styleDna }
    },
    events: [{
      stroke_id: stream.id,
      state,
      payload: {
        pitch: {
          base_note: baseNote,
          micro_offset: microOffset,
          is_gliding: true
        },
        dynamics: {
          energy: stream.energy,
          pressure: stream.pressure,
          velocity: Math.sqrt(Math.pow(stream.x - stream.prevX, 2) + Math.pow(stream.y - stream.prevY, 2)) * 1000
        },
        spatial: {
          x_axis: stream.x,
          y_axis: stream.y,
          area: stream.pressure
        },
        intent: {
          staccato_weight: stream.energy > 0.8 ? 0.5 : 0,
          vibrato_depth: vibratoDepth
        }
      }
    }]
  };

  emit('input', nmef);
};

// --- 视觉渲染 ---
const createParticles = (stream: Stream) => {
  const count = Math.floor(stream.energy * 5) + 1;
  const w = container.value?.clientWidth || 0;
  const h = container.value?.clientHeight || 0;
  
  for (let i = 0; i < count; i++) {
    particles.push({
      x: stream.x * w,
      y: stream.y * h,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 1.0,
      size: 1 + stream.energy * 8,
      color: `hsla(${200 + stream.energy * 100}, 80%, 70%, `
    });
  }
};

const render = () => {
  if (!ctx || !canvas.value || !container.value) return;

  const w = container.value.clientWidth;
  const h = container.value.clientHeight;

  // 背景：有机渐变
  const bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
  bgGrad.addColorStop(0, '#0a0a12');
  bgGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 绘制引力球 (情绪锚点)
  gravityBalls.forEach(ball => {
    ball.pulse += 0.02;
    const pulseScale = 1 + Math.sin(ball.pulse) * 0.1;
    const x = ball.x * w;
    const y = ball.y * h;
    
    const grad = ctx!.createRadialGradient(x, y, 0, x, y, ball.radius * pulseScale);
    grad.addColorStop(0, ball.color);
    grad.addColorStop(1, 'transparent');
    
    ctx!.fillStyle = grad;
    ctx!.beginPath();
    ctx!.arc(x, y, ball.radius * pulseScale, 0, Math.PI * 2);
    ctx!.fill();
    
    // 弱线条装饰
    ctx!.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx!.lineWidth = 1;
    ctx!.stroke();
  });

  // 绘制粒子轨迹
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= PARTICLE_LIFE_DECAY;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color + (p.life * 0.6) + ')';
    ctx.fill();
  }

  // 绘制活跃流的动态轨迹
  activeStreams.forEach(stream => {
    const x = stream.x * w;
    const y = stream.y * h;
    
    ctx!.shadowBlur = 15 * stream.energy;
    ctx!.shadowColor = 'rgba(59, 130, 246, 0.5)';
    
    ctx!.beginPath();
    ctx!.moveTo(stream.prevX * w, stream.prevY * h);
    ctx!.lineTo(x, y);
    ctx!.strokeStyle = `rgba(255, 255, 255, ${0.3 + stream.energy * 0.5})`;
    ctx!.lineWidth = 2 + stream.energy * 10;
    ctx!.lineCap = 'round';
    ctx!.stroke();
    
    ctx!.shadowBlur = 0;
  });

  animationFrameId = requestAnimationFrame(render);
};

// 监听外部事件（Demo）
watch(() => props.externalEvents, (newData) => {
  if (!newData || !newData.events.length) return;
  const event = newData.events[0];
  const id = `external-${event.stroke_id}`;
  
  if (event.state === 'active') {
    const stream = activeStreams.get(id) || {
      id, x: 0, y: 0, prevX: 0, prevY: 0,
      pressure: 0.5, energy: 0.5, active: true,
      startTime: Date.now(), isExternal: true
    };
    stream.prevX = stream.x || event.payload.spatial.x_axis;
    stream.prevY = stream.y || event.payload.spatial.y_axis;
    stream.x = event.payload.spatial.x_axis;
    stream.y = event.payload.spatial.y_axis;
    stream.energy = event.payload.dynamics.energy;
    activeStreams.set(id, stream);
    createParticles(stream);
  } else {
    activeStreams.delete(id);
  }
}, { deep: true });

</script>
