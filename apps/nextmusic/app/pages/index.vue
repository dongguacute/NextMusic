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
          v-if="audioStarted && !isPlayingDemo"
          @click="playDemo" 
          class="px-4 py-1 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-500 transition-colors"
        >
          PLAY DEMO
        </button>
        <button 
          v-if="isPlayingDemo"
          @click="stopDemo" 
          class="px-4 py-1 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-500 transition-colors"
        >
          STOP DEMO
        </button>
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
      :class="{ 'pointer-events-none opacity-90': isPlayingDemo }"
      @mousedown="handleEvent($event, 'start')"
      @mousemove="handleEvent($event, 'move')"
      @mouseup="handleEvent($event, 'end')"
      @mouseleave="handleEvent($event, 'end')"
      @touchstart.prevent="handleTouch($event, 'start')"
      @touchmove.prevent="handleTouch($event, 'move')"
      @touchend.prevent="handleTouch($event, 'end')"
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
import { ref, onUnmounted } from 'vue';
import { Coordinator, type InputData } from '@netxmusic/core';
import { PIANO_SAMPLES } from '../assets/config/piano-samples';

// --- 状态变量 ---
const touchZone = ref<HTMLElement | null>(null);
const audioStarted = ref(false);
const isPressing = ref(false);
const touchX = ref(0);
const touchY = ref(0);
const currentEnergy = ref(0);
const currentPitch = ref(60);
const statusText = ref('等待音频初始化...');
const isPlayingDemo = ref(false);

// --- 引擎组件 ---
let coordinator: Coordinator | null = null;
let piano: any = null;
let filter: any = null;
let midiPlayer: any = null;
let Tone: any = null;

// --- 初始化 MIDI Player ---
const initMidiPlayer = async () => {
  if (!Tone) return;
  // @ts-ignore
  const MidiModule = await import('midi-player-js');
  // 某些环境下导入的是 { Player: ... }，某些是默认导出
  const Player = MidiModule.Player || MidiModule.default?.Player || MidiModule.default;
  
  midiPlayer = new Player((event: any) => {
    if (event.name === 'Note on' && event.velocity > 0) {
      const midi = event.noteNumber;
      const note = Tone.Frequency(midi, "midi").toNote();
      
      isPressing.value = true;
      
      // 模拟触控位置映射
      const rect = touchZone.value?.getBoundingClientRect();
      if (rect) {
        const xRatio = (midi - 48) / 36;
        touchX.value = rect.left + rect.width * xRatio;
        touchY.value = rect.top + rect.height * 0.4;
      }
      
      currentPitch.value = midi;
      currentEnergy.value = (event.velocity / 127) * 0.8 + 0.1;
      
      // 使用 Tone.js 播放
      if (piano) {
        piano.triggerAttack(note, Tone.now(), event.velocity / 127);
      }
      
      processNMEF();
    } else if (event.name === 'Note off' || (event.name === 'Note on' && event.velocity === 0)) {
      const midi = event.noteNumber;
      const note = Tone.Frequency(midi, "midi").toNote();
      if (piano) {
        piano.triggerRelease(note, Tone.now());
      }
    }
  });
};

// --- 初始化 Tone.js ---
const initAudio = async () => {
  if (audioStarted.value) return;
  
  statusText.value = '正在启动 Tone.js...';
  // @ts-ignore
  Tone = await import('tone');
  await Tone.start();
  console.log('[Audio] Tone.js started, state:', Tone.context.state);
  
  coordinator = new Coordinator();
  
  // 效果链
  const reverb = new Tone.Reverb({
    decay: 3,
    wet: 0.3
  }).toDestination();
  
  filter = new Tone.Filter({
    type: "lowpass",
    frequency: 8000,
    Q: 0.4
  }).connect(reverb);
  
  // 钢琴音源 (使用 Sampler 加载高质量采样)
  piano = new Tone.Sampler({
    ...PIANO_SAMPLES,
    volume: 12,
    release: 1,
    onload: () => {
      console.log('[Audio] Piano samples loaded successfully');
      statusText.value = '钢琴音色加载完成！';
      audioStarted.value = true;
    },
    onerror: (err: any) => {
      console.error('[Audio] Piano samples load error:', err);
      statusText.value = '采样加载失败，请检查网络';
    }
  }).connect(filter);

  statusText.value = '正在加载钢琴采样...';
};

// --- 手势处理 ---
const handleEvent = (e: MouseEvent | Touch, state: 'start' | 'move' | 'end') => {
  if (!audioStarted.value) return;

  if (state === 'start') {
    isPressing.value = true;
    updatePosition(e);
    if (piano && Tone) {
      const note = Tone.Frequency(currentPitch.value, "midi").toNote();
      piano.triggerAttack(note, Tone.now(), currentEnergy.value);
    }
  } else if (state === 'move') {
    if (!isPressing.value) return;
    updatePosition(e);
    if (filter && Tone) {
      filter.frequency.setTargetAtTime(500 + currentEnergy.value * 8000, Tone.now(), 0.1);
    }
  } else if (state === 'end') {
    isPressing.value = false;
    if (piano && Tone) {
      piano.releaseAll();
    }
    return; // End doesn't need processNMEF here as it's handled inside or by next start
  }
  
  processNMEF();
};

const handleTouch = (e: TouchEvent, state: 'start' | 'move' | 'end') => {
  if (state === 'end') {
    handleEvent({} as any, 'end');
  } else if (e.touches[0]) {
    handleEvent(e.touches[0], state);
  }
};

const updatePosition = (e: MouseEvent | Touch) => {
  touchX.value = e.clientX;
  touchY.value = e.clientY;
  
  if (touchZone.value) {
    const rect = touchZone.value.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    currentPitch.value = 48 + x * 36;
    currentEnergy.value = 1.0 - y;
  }
};

// --- 核心逻辑 ---
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

  const instructions = coordinator.processInput(nmefData);
  if (instructions && instructions.length > 0 && instructions[0]) {
    statusText.value = `技法: ${instructions[0].technique}`;
  }
};

// --- 自动演奏 (Demo) ---
const playDemo = async () => {
  if (!audioStarted.value || isPlayingDemo.value) return;
  
  // 确保 Tone.js 上下文已恢复
  if (Tone && Tone.context.state !== 'running') {
    await Tone.start();
  }
  
  isPlayingDemo.value = true;
  statusText.value = '正在从 MIDI 文件自动演奏：华晨宇 - 好想爱这个世界啊';
  
  try {
    if (!midiPlayer) await initMidiPlayer();
    
    const response = await fetch('/music/song.mid');
    const arrayBuffer = await response.arrayBuffer();
    midiPlayer.loadArrayBuffer(arrayBuffer);
    midiPlayer.play();
  } catch (e) {
    console.error('Failed to play MIDI:', e);
    statusText.value = 'MIDI 播放失败';
    isPlayingDemo.value = false;
  }
};

const stopDemo = () => {
  if (midiPlayer) {
    midiPlayer.stop();
  }
  isPlayingDemo.value = false;
  handleEnd();
  statusText.value = '自动演奏已停止';
};

onUnmounted(() => {
  stopDemo();
  if (Tone) {
    Tone.getDestination().mute = true;
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
