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
      Fluid Sound Stream | {{ currentScale }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { type InputData } from '@netxmusic/core';

const props = defineProps<{
  currentScale: string;
  styleDna: string;
  sessionId: string;
  externalEvents?: InputData | null; // 接收外部事件（如 Demo 播放）
}>();

const emit = defineEmits<{
  (e: 'input', data: InputData): void;
}>();

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let animationFrameId: number;

// 流体粒子系统
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

// 活跃的流（Stream）
interface Stream {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pressure: number;
  energy: number;
  active: boolean;
  isExternal?: boolean; // 标记是否为外部 Demo 事件
  pullX?: number; // 被拉扯后的位置
  pullY?: number;
  velocity: number; // 瞬时速度
  inertiaX: number; // 惯性分量
  inertiaY: number;
  lastMoveTime: number;
}

// 推荐旋律线（吸引子）
interface PathPoint {
  x: number;
  y: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}
const melodyPath = ref<PathPoint[]>([]);
let pathPhase = 0;

// 生成平滑的推荐旋律线
const generateMelodyPath = (width: number, height: number) => {
  const points: PathPoint[] = [];
  const segments = 6;
  const step = width / segments;
  
  for (let i = 0; i <= segments; i++) {
    const x = i * step;
    // 基于正弦波和随机偏移生成基础 y
    const baseLine = height * 0.5;
    const amplitude = height * 0.2;
    const y = baseLine + Math.sin(pathPhase + i * 0.8) * amplitude;
    
    // 贝塞尔控制点
    points.push({
      x,
      y,
      cp1x: x - step / 2,
      cp1y: y,
      cp2x: x + step / 2,
      cp2y: y
    });
  }
  melodyPath.value = points;
};

const updatePath = (deltaTime: number) => {
  pathPhase += deltaTime * 0.001;
  if (container.value) {
    generateMelodyPath(container.value.clientWidth, container.value.clientHeight);
  }
  
  // 处理能量衰减和惯性模拟
  activeStreams.forEach((stream, id) => {
    if (stream.active) {
      // 能量随时间自然衰减，模拟阻尼
      stream.energy *= 0.95;
      
      // 如果能量极低且没有新的位移，保持微弱共鸣或停止
      if (stream.energy < 0.001) {
        stream.energy = 0;
      } else {
        // 即使手指不动，也持续发送数据以维持平滑的参数变化（去离散化）
        const rect = container.value?.getBoundingClientRect();
        if (rect) {
          const { distance } = getClosestPointOnPath(
            (stream.pullX || stream.x) * rect.width, 
            (stream.pullY || stream.y) * rect.height
          );
          sendStreamData(stream, 'active', distance / Math.max(rect.width, rect.height));
        }
      }
    }
  });
};

// 计算点到路径的最短距离和投影点
const getClosestPointOnPath = (x: number, y: number) => {
  if (melodyPath.value.length === 0) return { distance: 0, nx: x, ny: y };
  
  let minDistance = Infinity;
  let closestX = x;
  let closestY = y;
  
  // 简化计算：只检查采样点
  melodyPath.value.forEach(p => {
    const dx = x - p.x;
    const dy = y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) {
      minDistance = dist;
      closestX = p.x;
      closestY = p.y;
    }
  });
  
  return { distance: minDistance, nx: closestX, ny: closestY };
};

const activeStreams = new Map<string, Stream>();

// 监听外部事件以更新视觉效果
import { watch } from 'vue';
watch(() => props.externalEvents, (newData) => {
  if (!newData || !newData.events || newData.events.length === 0) return;
  
  const event = newData.events[0];
  if (!event) return;
  
  const id = `external-${event.stroke_id}`;
  
  if (event.state === 'active') {
    const stream: Stream = {
      id,
      x: event.payload.spatial.x_axis,
      y: event.payload.spatial.y_axis,
      prevX: event.payload.spatial.x_axis,
      prevY: event.payload.spatial.y_axis,
      pressure: event.payload.dynamics.pressure,
      energy: event.payload.dynamics.energy,
      active: true,
      isExternal: true,
      velocity: event.payload.dynamics.velocity,
      inertiaX: 0,
      inertiaY: 0,
      lastMoveTime: performance.now()
    };
    activeStreams.set(id, stream);
    createParticles(stream);
  } else {
    activeStreams.delete(id);
  }
}, { deep: true });

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    render();
  }
});

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
  window.removeEventListener('resize', resizeCanvas);
  
  // 彻底清理引用，防止内存泄漏导致的 IPC 崩溃
  activeStreams.clear();
  particles.length = 0;
  ctx = null;
  
  console.log('[ExperimentalInput] Resources safely released');
});

const resizeCanvas = () => {
  if (canvas.value && container.value) {
    const rect = container.value.getBoundingClientRect();
    canvas.value.width = rect.width * window.devicePixelRatio;
    canvas.value.height = rect.height * window.devicePixelRatio;
    if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
};

const handlePointerDown = (e: PointerEvent) => {
  const rect = container.value?.getBoundingClientRect();
  if (!rect) return;

  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const id = `stream-${e.pointerId}`;
  
  // 计算吸引子逻辑
  const { distance, nx, ny } = getClosestPointOnPath(e.clientX - rect.left, e.clientY - rect.top);
  const normalizedDist = distance / Math.max(rect.width, rect.height);
  
  const stream: Stream = {
    id,
    x: nx / rect.width,
    y: ny / rect.height,
    prevX: x,
    prevY: y,
    pullX: x,
    pullY: y,
    pressure: e.pressure || 0.5,
    energy: 0, // 初始能量为0，没有位移就没有声音
    active: true,
    velocity: 0,
    inertiaX: 0,
    inertiaY: 0,
    lastMoveTime: performance.now()
  };
  
  activeStreams.set(id, stream);
  // PointerDown 不再直接触发发声，仅初始化状态
  // sendStreamData(stream, 'active', normalizedDist);
};

const handlePointerMove = (e: PointerEvent) => {
  const id = `stream-${e.pointerId}`;
  const stream = activeStreams.get(id);
  if (!stream) return;

  const rect = container.value?.getBoundingClientRect();
  if (!rect) return;

  const now = performance.now();
  const dt = Math.max(1, now - stream.lastMoveTime);
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const currentPullX = mouseX / rect.width;
  const currentPullY = mouseY / rect.height;
  
  // 计算位移增量
  const dx = currentPullX - (stream.pullX || currentPullX);
  const dy = currentPullY - (stream.pullY || currentPullY);
  const distanceMoved = Math.sqrt(dx * dx + dy * dy);
  
  // 动能映射：1/2 * m * v^2，这里简化为 v^2
  const velocity = distanceMoved / (dt / 1000); // 单位：屏幕占比/秒
  const kineticEnergy = 0.5 * Math.pow(velocity, 2);
  
  // 吸引子逻辑
  const { distance, nx, ny } = getClosestPointOnPath(mouseX, mouseY);
  const normalizedDist = distance / Math.max(rect.width, rect.height);

  stream.prevX = stream.x;
  stream.prevY = stream.y;
  
  // 更新状态
  stream.x = nx / rect.width; 
  stream.y = ny / rect.height;
  stream.pullX = currentPullX;
  stream.pullY = currentPullY;
  stream.velocity = velocity;
  stream.lastMoveTime = now;
  
  // 能量守恒：能量随位移产生，随时间衰减
  // 只有位移足够大时才产生显著能量
  stream.energy = Math.min(1, kineticEnergy * 10 + (stream.energy * 0.8));
  
  stream.pressure = e.pressure || 0.5;

  // 惯性积累：记录最后的移动趋势
  stream.inertiaX = dx / dt;
  stream.inertiaY = dy / dt;

  if (stream.energy > 0.01) {
    createParticles(stream);
    sendStreamData(stream, 'active', normalizedDist);
  }
};

const handlePointerUp = (e: PointerEvent) => {
  const id = `stream-${e.pointerId}`;
  const stream = activeStreams.get(id);
  if (!stream) return;

  const rect = container.value?.getBoundingClientRect();
  const dist = stream.pullX && stream.pullY ? 
    Math.sqrt(Math.pow(stream.pullX - stream.x, 2) + Math.pow(stream.pullY - stream.y, 2)) : 0;

  stream.active = false;
  sendStreamData(stream, 'end', dist);
  activeStreams.delete(id);
};

const createParticles = (stream: Stream) => {
  const count = Math.floor(stream.pressure * 10) + 2;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: stream.x * (container.value?.clientWidth || 0),
      y: stream.y * (container.value?.clientHeight || 0),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 1.0,
      size: 2 + Math.random() * 5 * stream.energy,
      color: `hsla(${200 + stream.energy * 60}, 80%, 60%, `
    });
  }
};

const sendStreamData = (stream: Stream, state: 'active' | 'end', tension: number = 0) => {
  // 惯性音高漂移 (Pitch Drift)
  // 当速度降低或停止时，根据惯性产生微小的偏移
  const drift = stream.velocity < 0.1 ? (stream.inertiaX * 50) : 0;
  
  const nonlinearX = Math.pow(stream.x, 1.2); 
  
  const nmef: InputData = {
    header: {
      version: "2.1-kinetic", // 升级版本号
      timestamp: Date.now(),
      session_id: props.sessionId,
      global_context: {
        scale: props.currentScale,
        style_dna: props.styleDna
      }
    },
    events: [{
      stroke_id: stream.id,
      state,
      payload: {
        pitch: {
          base_note: 48 + Math.floor(nonlinearX * 36),
          // 融合张力导致的微音程偏移与惯性漂移
          micro_offset: (nonlinearX * 36 % 1) * 100 + (tension * 200) + drift,
          is_gliding: true 
        },
        dynamics: {
          // 核心：使用基于动能计算的 energy
          energy: stream.energy,
          pressure: stream.pressure,
          velocity: stream.velocity * 100
        },
        spatial: {
          x_axis: stream.x,
          y_axis: stream.y,
          area: stream.pressure
        },
        intent: {
          // 张力与速度共同决定表现力
          staccato_weight: Math.min(1, tension * 2 + stream.velocity * 0.5),
          vibrato_depth: stream.pressure * 0.3 + (tension * 0.5)
        }
      }
    }]
  };

  emit('input', nmef);
};

const render = () => {
  if (!ctx || !canvas.value || !container.value || animationFrameId === 0) return;

  const w = container.value.clientWidth;
  const h = container.value.clientHeight;

  // 更新路径动画
  updatePath(16); // 假设 60fps

  // 拖尾效果
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, w, h);

  // 绘制推荐旋律线（吸引子）
  if (melodyPath.value.length > 0 && melodyPath.value[0]) {
    ctx.beginPath();
    ctx.moveTo(melodyPath.value[0].x, melodyPath.value[0].y);
    
    // 计算当前整体张力（用于视觉反馈）
    let totalTension = 0;
    activeStreams.forEach(s => {
      const pullX = s.pullX ?? s.x;
      const pullY = s.pullY ?? s.y;
      totalTension += Math.sqrt(Math.pow(pullX - s.x, 2) + Math.pow(pullY - s.y, 2));
    });

    for (let i = 1; i < melodyPath.value.length; i++) {
      const p = melodyPath.value[i];
      const prev = melodyPath.value[i-1];
      if (p && prev) {
        ctx.bezierCurveTo(prev.cp2x, prev.cp2y, p.cp1x, p.cp1y, p.x, p.y);
      }
    }
    
    // 线的颜色代表音色明暗，波幅代表 energy
    const hue = 200 + totalTension * 100;
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
    ctx.lineWidth = 2 + totalTension * 10;
    ctx.shadowBlur = 15;
    ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.5)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 绘制粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (!p) continue;

    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color + p.life + ')';
    ctx.fill();
  }

  // 绘制活跃的流
  activeStreams.forEach(stream => {
    const x = stream.x * w;
    const y = stream.y * h;
    const px = (stream.pullX || stream.x) * w;
    const py = (stream.pullY || stream.y) * h;

    // 绘制拉扯线（视觉上的张力感）
    ctx!.beginPath();
    ctx!.moveTo(x, y);
    ctx!.lineTo(px, py);
    ctx!.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx!.setLineDash([5, 5]);
    ctx!.stroke();
    ctx!.setLineDash([]);

    // 核心光晕
    const gradient = ctx!.createRadialGradient(px, py, 0, px, py, 50 * stream.pressure);
    // Demo 播放使用紫色调，用户输入使用蓝色调
    const color = stream.isExternal ? '167, 139, 250' : '59, 130, 246';
    gradient.addColorStop(0, `rgba(${color}, ${0.4 * stream.pressure})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    
    ctx!.fillStyle = gradient;
    ctx!.fillRect(px - 100, py - 100, 200, 200);

    // 交互点（手指位置）
    ctx!.beginPath();
    ctx!.arc(px, py, 6, 0, Math.PI * 2);
    ctx!.fillStyle = stream.isExternal ? '#f5d0fe' : '#fff';
    ctx!.fill();

    // 锚点（线上吸附位置）
    ctx!.beginPath();
    ctx!.arc(x, y, 3, 0, Math.PI * 2);
    ctx!.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx!.fill();
  });

  animationFrameId = requestAnimationFrame(render);
};
</script>
