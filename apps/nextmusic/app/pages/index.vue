<template>
  <div class="fixed inset-0 bg-black overflow-hidden touch-none select-none flex flex-col">
    <!-- 顶部状态栏 -->
    <div class="p-4 bg-zinc-900 text-white flex justify-between items-center z-10 border-b border-zinc-800">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold tracking-tighter">NextMusic <span class="text-xs bg-blue-600 px-1 rounded ml-1">TEST</span></h1>
        <div class="text-xs text-zinc-400 font-mono">
          {{ statusText }}
        </div>
      </div>
      <div class="flex gap-2">
        <button 
          @click="initAudio" 
          v-if="!audioStarted"
          class="px-4 py-1 bg-white text-black text-sm font-bold rounded hover:bg-zinc-200 transition-colors"
        >
          START AUDIO
        </button>
        <div v-else class="flex gap-4 items-center">
          <div class="flex flex-col items-end">
            <span class="text-[10px] text-zinc-500 uppercase">Energy</span>
            <div class="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 transition-all duration-75" :style="{ width: `${currentEnergy * 100}%` }"></div>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-[10px] text-zinc-500 uppercase">Pitch</span>
            <span class="text-xs font-mono text-blue-400">{{ currentPitch.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 触控区 -->
    <div 
      ref="touchZone"
      class="flex-1 relative cursor-crosshair active:cursor-none"
      @mousedown="handleStart"
      @mousemove="handleMove"
      @mouseup="handleEnd"
      @mouseleave="handleEnd"
      @touchstart.prevent="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend.prevent="handleTouchEnd"
    >
      <!-- 视觉反馈：波纹/点 -->
      <div 
        v-if="isPressing"
        class="absolute pointer-events-none rounded-full border-2 border-blue-500/50 bg-blue-500/10 transition-transform duration-75"
        :style="{
          left: `${touchX}px`,
          top: `${touchY}px`,
          width: `${40 + currentEnergy * 100}px`,
          height: `${40 + currentEnergy * 100}px`,
          transform: 'translate(-50%, -50%)',
          opacity: 0.5 + currentEnergy * 0.5
        }"
      ></div>
      
      <!-- 网格背景 -->
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <div class="w-full h-full" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 40px 40px;"></div>
      </div>

      <div class="absolute bottom-8 left-8 text-zinc-600 pointer-events-none max-w-xs">
        <p class="text-sm font-medium mb-1">操作指南：</p>
        <ul class="text-xs space-y-1 opacity-70">
          <li>• 水平滑动改变音高 (Pitch)</li>
          <li>• 垂直滑动或压力改变能量 (Energy)</li>
          <li>• 点击开始生成 NMEF 实时驱动 Coordinator</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Coordinator, type InputData } from '@netxmusic/core';

// --- 状态变量 ---
const touchZone = ref<HTMLElement | null>(null);
const audioStarted = ref(false);
const isPressing = ref(false);
const touchX = ref(0);
const touchY = ref(0);
const currentEnergy = ref(0);
const currentPitch = ref(60);
const statusText = ref('等待音频初始化...');

// --- 引擎组件 ---
let coordinator: Coordinator | null = null;
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillator: OscillatorNode | null = null;
let filter: BiquadFilterNode | null = null;

// --- 初始化 ---
const initAudio = async () => {
  if (audioCtx) return;
  
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    coordinator = new Coordinator();
    
    // 简单的 Web Audio 链: Osc -> Filter -> Gain -> Destination
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    
    filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1;

    masterGain.connect(audioCtx.destination);
    filter.connect(masterGain);

    audioStarted.value = true;
    statusText.value = '音频就绪，请在屏幕上滑动';
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    // 启动基础振荡器
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.connect(filter);
    oscillator.start();
  } catch (e) {
    console.error('Failed to init audio:', e);
    statusText.value = '音频初始化失败';
  }
};

// --- 手势处理 ---
const handleStart = (e: MouseEvent | Touch) => {
  if (!audioStarted.value) return;
  isPressing.value = true;
  updatePosition(e);
  // startSound(); // 不再需要每次点击启动，只需控制增益
  processNMEF();
};

const handleMove = (e: MouseEvent | Touch) => {
  if (!isPressing.value) return;
  updatePosition(e);
  processNMEF();
};

const handleEnd = () => {
  isPressing.value = false;
  // stopSound(); // 不再停止振荡器，只需控制增益
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  }
};

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches[0]) handleStart(e.touches[0]);
};
const handleTouchMove = (e: TouchEvent) => {
  if (e.touches[0]) handleMove(e.touches[0]);
};
const handleTouchEnd = () => handleEnd();

const updatePosition = (e: MouseEvent | Touch) => {
  touchX.value = e.clientX;
  touchY.value = e.clientY;
  
  if (touchZone.value) {
    const rect = touchZone.value.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    // 映射：X -> Pitch (MIDI 48-84), Y -> Energy (1.0 - 0.0)
    currentPitch.value = 48 + x * 36;
    currentEnergy.value = 1.0 - y;
  }
};

// --- 核心逻辑：生成 NMEF 并驱动 Coordinator ---
const processNMEF = () => {
  if (!coordinator) return;

  const nmefData: InputData = {
    header: {
      version: "1.0",
      timestamp: Date.now(),
      session_id: "test-session",
      global_context: { scale: 'c-major', style_dna: 'Jazz' }
    },
    events: [{
      stroke_id: "stroke_001",
      state: isPressing.value ? "active" : "end",
      payload: {
        pitch: { 
          base_note: Math.floor(currentPitch.value), 
          micro_offset: (currentPitch.value % 1) * 100, 
          is_gliding: true 
        },
        dynamics: { 
          energy: currentEnergy.value, 
          pressure: currentEnergy.value, 
          velocity: 100 
        },
        spatial: { 
          x_axis: touchX.value / (window.innerWidth || 1), 
          y_axis: touchY.value / (window.innerHeight || 1), 
          area: 0.1 
        },
        intent: { staccato_weight: 0, vibrato_depth: 0.1 }
      }
    }]
  };

  // 驱动 Coordinator
  const instructions = coordinator.processInput(nmefData);
  if (instructions && instructions.length > 0 && instructions[0]) {
    statusText.value = `技法: ${instructions[0].technique}`;
  }

  // 更新声音
  updateAudioParameters();
};

const updateAudioParameters = () => {
  if (!audioCtx || !oscillator || !masterGain || !filter) return;

  const now = audioCtx.currentTime;
  
  // 频率计算 (MIDI to Hz)
  const freq = 440 * Math.pow(2, (currentPitch.value - 69) / 12);
  oscillator.frequency.setTargetAtTime(freq, now, 0.05);

  // 能量映射到增益和滤波频率
  const targetGain = isPressing.value ? currentEnergy.value * 0.3 : 0;
  masterGain.gain.setTargetAtTime(targetGain, now, 0.05);
  
  const filterFreq = 200 + currentEnergy.value * 5000;
  filter.frequency.setTargetAtTime(filterFreq, now, 0.05);
};

onUnmounted(() => {
  if (audioCtx) {
    audioCtx.close();
  }
});
</script>

<style>
/* 确保全屏且无滚动 */
html, body, #__nuxt {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: black;
}
</style>
