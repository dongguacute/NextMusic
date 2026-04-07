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
const isPlayingDemo = ref(false);

// --- 引擎组件 ---
let coordinator: Coordinator | null = null;
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let reverbNode: ConvolverNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

// 钢琴音色相关的 AudioBuffer
const pianoSamples = ref<Map<number, AudioBuffer>>(new Map());
const activeNodes = new Map<number, AudioBufferSourceNode>();

// 生成简单的混响脉冲响应 (Impulse Response)
const createReverb = (ctx: AudioContext, duration: number, decay: number) => {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let i = 0; i < 2; i++) {
    const channelData = impulse.getChannelData(i);
    for (let j = 0; j < length; j++) {
      channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
    }
  }
  return impulse;
};

// 加载钢琴采样 (使用公开的钢琴采样 URL 作为演示)
const loadPianoSamples = async (ctx: AudioContext) => {
  statusText.value = '正在加载钢琴音色...';
  // 切换到更优质的采样源
  const baseUrl = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3';
  const notes = [24, 36, 48, 60, 72, 84, 96]; // 覆盖更广音域
  
  const midiToName = (midi: number) => {
    const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
  };

  for (const midi of notes) {
    try {
      const name = midiToName(midi).replace('#', 's');
      const response = await fetch(`${baseUrl}/${name}.mp3`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      pianoSamples.value.set(midi, audioBuffer);
    } catch (e) {
      console.error(`Failed to load sample for MIDI ${midi}`, e);
    }
  }
  statusText.value = '钢琴音色加载完成！';
};

// 寻找最近的采样并计算播放速率
const getClosestSample = (targetMidi: number) => {
  let closestMidi = -1;
  let minDiff = Infinity;
  
  for (const midi of pianoSamples.value.keys()) {
    const diff = Math.abs(targetMidi - midi);
    if (diff < minDiff) {
      minDiff = diff;
      closestMidi = midi;
    }
  }
  
  if (closestMidi === -1) return null;
  
  return {
    buffer: pianoSamples.value.get(closestMidi)!,
    playbackRate: Math.pow(2, (targetMidi - closestMidi) / 12)
  };
};

// --- 初始化 ---
const initAudio = async () => {
  if (audioCtx) return;
  
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    coordinator = new Coordinator();
    
    // 效果链: Sample -> Filter -> Compressor -> Reverb -> MasterGain -> Destination
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    compressor.knee.setValueAtTime(30, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = createReverb(audioCtx, 2.5, 2.0); // 2.5秒混响

    filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.7;

    // 连接节点
    filter.connect(compressor);
    compressor.connect(reverbNode);
    reverbNode.connect(masterGain);
    
    // 干湿分离 (Parallel Processing for Reverb)
    compressor.connect(masterGain); 
    
    masterGain.connect(audioCtx.destination);

    await loadPianoSamples(audioCtx);

    audioStarted.value = true;
    if (statusText.value.includes('加载完成')) {
      statusText.value = '音频就绪，请在屏幕上滑动';
    }
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
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
  processNMEF();
};

const handleMove = (e: MouseEvent | Touch) => {
  if (!isPressing.value) return;
  updatePosition(e);
  processNMEF();
};

const handleEnd = () => {
  isPressing.value = false;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
  }
  // 停止所有正在播放的源
  activeNodes.forEach(node => {
    try { node.stop(audioCtx!.currentTime + 0.5); } catch(e) {}
  });
  activeNodes.clear();
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
  if (!coordinator || !audioCtx) return;

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
  if (!audioCtx || !masterGain || !filter) return;

  const now = audioCtx.currentTime;
  
  // 钢琴采样播放逻辑
  const sampleInfo = getClosestSample(currentPitch.value);
  if (sampleInfo && isPressing.value) {
    // 如果音高变化较大或没有正在播放的源，启动新源 (模拟简单的连奏)
    const currentMidiInt = Math.round(currentPitch.value);
    if (!activeNodes.has(currentMidiInt)) {
      // 停止旧的源
      activeNodes.forEach((node, midi) => {
        if (Math.abs(midi - currentMidiInt) > 2) {
          node.stop(now + 0.1);
          activeNodes.delete(midi);
        }
      });

      const source = audioCtx.createBufferSource();
      source.buffer = sampleInfo.buffer;
      source.playbackRate.value = sampleInfo.playbackRate;
      source.loop = true; // 钢琴通常不循环，但为了持续发声这里开启循环
      source.connect(filter);
      source.start(now);
      activeNodes.set(currentMidiInt, source);
    } else {
      // 更新现有源的播放速率
      const node = activeNodes.get(currentMidiInt);
      if (node) {
        node.playbackRate.setTargetAtTime(sampleInfo.playbackRate, now, 0.05);
      }
    }
  }

  // 能量映射到增益和滤波频率
  const targetGain = isPressing.value ? currentEnergy.value * 0.8 : 0;
  masterGain.gain.setTargetAtTime(targetGain, now, 0.1);
  
  const filterFreq = 500 + currentEnergy.value * 8000;
  filter.frequency.setTargetAtTime(filterFreq, now, 0.1);
};

// --- 自动演奏 (Demo) ---
let demoInterval: any = null;
const playDemo = () => {
  if (!audioCtx || isPlayingDemo.value) return;
  
  isPlayingDemo.value = true;
  statusText.value = '正在自动演奏：巴赫 - G大调前奏曲 (片段)';
  
  // 简化的巴赫前奏曲音符序列 (MIDI)
  const bachNotes = [
    67, 62, 71, 69, 71, 62, 71, 62, // 第一小节
    67, 62, 71, 69, 71, 62, 71, 62,
    67, 64, 72, 71, 72, 64, 72, 64, // 第二小节
    67, 64, 72, 71, 72, 64, 72, 64,
    67, 65, 74, 72, 74, 65, 74, 65, // 第三小节
    67, 65, 74, 72, 74, 65, 74, 65,
    67, 62, 71, 69, 71, 62, 71, 62, // 回到根音
    67, 62, 71, 69, 71, 62, 71, 62
  ];
  
  let noteIndex = 0;
  const tempo = 150; // 毫秒/音符
  
  isPressing.value = true;
  
  demoInterval = setInterval(() => {
    const midi = bachNotes[noteIndex];
    if (midi === undefined) return;
    
    // 模拟触控位置映射
    const rect = touchZone.value?.getBoundingClientRect();
    if (rect) {
      const xRatio = (midi - 48) / 36;
      touchX.value = rect.left + rect.width * xRatio;
      touchY.value = rect.top + rect.height * 0.3; // 固定在 0.7 能量处
    }
    
    currentPitch.value = midi;
    currentEnergy.value = 0.7 + Math.random() * 0.2; // 增加一点动态随机感
    
    processNMEF();
    
    noteIndex = (noteIndex + 1) % bachNotes.length;
  }, tempo);
};

const stopDemo = () => {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
  isPlayingDemo.value = false;
  handleEnd();
  statusText.value = '自动演奏已停止';
};

onUnmounted(() => {
  stopDemo();
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
