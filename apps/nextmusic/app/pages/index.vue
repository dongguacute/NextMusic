<template>
  <div class="fixed inset-0 bg-black overflow-hidden touch-none select-none flex flex-col">
    <!-- 顶部状态栏 -->
    <div class="p-4 bg-zinc-900 text-white flex justify-between items-center z-10 border-b border-zinc-800">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-bold tracking-tighter">NextMusic <span class="text-xs bg-blue-600 px-1 rounded ml-1">EXPERIMENTAL</span></h1>
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
            <span class="text-[10px] text-zinc-500 uppercase">Mode</span>
            <span class="text-xs font-bold text-purple-400">FLUID EMOTION SPACE</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 情感空间流体交互区 -->
    <div class="flex-1 relative">
      <FluidPerformanceZone 
        v-if="audioStarted"
        current-scale="c-major"
        style-dna="Jazz"
        session-id="fluid-session"
        :external-events="demoInput"
        @input="handleExperimentalInput"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-zinc-500">
        请先点击 START AUDIO 启动引擎
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { Coordinator, type InputData, ScaleSystem } from '@netxmusic/core';
import { PIANO_SAMPLES } from '../assets/config/piano-samples';
import FluidPerformanceZone from '../components/FluidPerformanceZone.vue';

// --- 状态变量 ---
const audioStarted = ref(false);
const statusText = ref('等待音频初始化...');
const isPlayingDemo = ref(false);
const demoInput = ref<InputData | null>(null);

// --- 引擎组件 ---
let coordinator: Coordinator | null = null;
let scaleSystem: ScaleSystem | null = null;
let piano: any = null;
let filter: any = null;
let midiPlayer: any = null;
let Tone: any = null;

// 追踪活跃的音符，用于处理滑动和释放
const activeNotes = new Map<string, string>();

// --- 初始化 MIDI Player ---
const initMidiPlayer = async () => {
  if (!Tone) return;
  // @ts-ignore
  const MidiModule = await import('midi-player-js');
  const Player = MidiModule.Player || MidiModule.default?.Player || MidiModule.default;
  
  midiPlayer = new Player((event: any) => {
    if (event.name === 'Note on' && event.velocity > 0) {
      const midi = event.noteNumber;
      // 映射到 FluidPerformanceZone 的坐标空间
      const xRatio = (midi - 48) / 36;
      const yRatio = 0.5;
      
      // 构造 NMEF 数据流传给 FluidPerformanceZone 视觉反馈
      demoInput.value = {
        header: {
          version: "3.0-demo",
          timestamp: Date.now(),
          session_id: "demo-session",
          global_context: { scale: 'c-major', style_dna: 'Jazz' }
        },
        events: [{
          stroke_id: `demo-${midi}`,
          state: "active",
          payload: {
            pitch: { base_note: midi, micro_offset: 0, is_gliding: false },
            dynamics: { energy: event.velocity / 127, pressure: 0.5, velocity: event.velocity },
            spatial: { x_axis: xRatio, y_axis: yRatio, area: 0.1 },
            intent: { staccato_weight: 0, vibrato_depth: 0 }
          }
        }]
      };

      handleExperimentalInput(demoInput.value);
    } else if (event.name === 'Note off' || (event.name === 'Note on' && event.velocity === 0)) {
      const midi = event.noteNumber;
      demoInput.value = {
        header: {
          version: "3.0-demo",
          timestamp: Date.now(),
          session_id: "demo-session",
          global_context: { scale: 'c-major', style_dna: 'Jazz' }
        },
        events: [{
          stroke_id: `demo-${midi}`,
          state: "end",
          payload: {
            pitch: { base_note: midi, micro_offset: 0, is_gliding: false },
            dynamics: { energy: 0, pressure: 0, velocity: 0 },
            spatial: { x_axis: 0, y_axis: 0, area: 0 },
            intent: { staccato_weight: 0, vibrato_depth: 0 }
          }
        }]
      };
      handleExperimentalInput(demoInput.value);
    }
  });
};

// --- 自动演奏 (Demo) ---
const playDemo = async () => {
  if (!audioStarted.value || isPlayingDemo.value) return;
  
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
  statusText.value = '自动演奏已停止';
};

// --- 初始化 Tone.js ---
const initAudio = async () => {
  if (audioStarted.value) return;
  
  statusText.value = '正在启动 Tone.js...';
  // @ts-ignore
  Tone = await import('tone');
  await Tone.start();
  
  coordinator = new Coordinator();
  // 初始化 ScaleSystem
  scaleSystem = new ScaleSystem({ scale: 'c-major', style_dna: 'Jazz' });
  
  // 效果链
  const reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();
  filter = new Tone.Filter({ type: "lowpass", frequency: 8000, Q: 0.4 }).connect(reverb);
  
  // 钢琴音源
  piano = new Tone.Sampler({
    ...PIANO_SAMPLES,
    volume: 0, // 初始音量由流体逻辑控制
    curve: "exponential",
    attack: 0.1,
    release: 2,
    onload: () => {
      statusText.value = '流体驱动引擎就绪';
      audioStarted.value = true;
    }
  }).connect(filter);
};

// --- 处理实验性输入 ---
const handleExperimentalInput = (data: InputData) => {
  if (!coordinator || !scaleSystem || !piano || !Tone) return;

  const event = data.events[0];
  if (!event) return;
  const strokeId = event.stroke_id;
  
  // 1. 使用 ScaleSystem 解析频率/音高
  const freq = scaleSystem.resolveFrequency(event.payload);
  const note = Tone.Frequency(freq).toNote();
  
  // 2. 使用 Coordinator 解析物理激励指令
  const instructions = coordinator.processInput(data);
  const instruction = instructions[0];

  if (event.state === 'active') {
    const lastNote = activeNotes.get(strokeId);
    
    // 检查是否为预测性辅助触发
    if (instruction && instruction.trigger_type === 'predictive_assist') {
      const { chords = [], smoothing = 0 } = instruction;
      
      // 实时更新音量与亮度
      const volume = Tone.gainToDb(instruction.volume || 0.5);
      const smoothTime = (smoothing / 1000) || 0.1;
      piano.volume.setTargetAtTime(volume, Tone.now(), smoothTime);
      
      if (filter) {
        const cutoffFreq = 200 + (instruction.cutoff || 0.5) * 12000;
        filter.frequency.setTargetAtTime(cutoffFreq, Tone.now(), smoothTime + 0.1);
      }

      // 自动路径引导：ExperimentalInput 已经处理了捕获逻辑
      // 这里处理多声部和弦触发
      const freq = scaleSystem.resolveFrequency(event.payload);
      const note = Tone.Frequency(freq).toNote();
      
      chords.forEach((midi, index) => {
        const chordNote = Tone.Frequency(midi, "midi").toNote();
        // 仅在音符改变时触发，避免重复触发
        const chordKey = `${strokeId}-chord-${index}`;
        if (activeNotes.get(chordKey) !== chordNote) {
          // 伴奏声部力度稍轻
          const velocity = index === 0 ? event.payload.dynamics.energy : event.payload.dynamics.energy * 0.6;
          piano.triggerAttack(chordNote, Tone.now(), velocity);
          if (activeNotes.has(chordKey)) {
            piano.triggerRelease(activeNotes.get(chordKey), Tone.now() + 0.2);
          }
          activeNotes.set(chordKey, chordNote);
        }
      });
      activeNotes.set(strokeId, note);
    } else if (instruction && instruction.trigger_type === 'physical_excitation' && instruction.physics) {
      const { frequency, energy, harmonics } = instruction.physics;
      
      // 实时更新物理弦的声音特性
      const volume = Tone.gainToDb(Math.min(1, energy * 2.0));
      piano.volume.setTargetAtTime(volume, Tone.now(), 0.05);
      
      if (filter) {
        // 谐波丰富度映射到截止频率
        const cutoffFreq = 100 + harmonics * 15000;
        filter.frequency.setTargetAtTime(cutoffFreq, Tone.now(), 0.1);
      }

      // 物理频率映射到音符（用于 Sampler 兼容，实际应使用 Oscillator 或物理合成器）
      const note = Tone.Frequency(frequency).toNote();
      if (lastNote !== note) {
        // 物理激励下，triggerAttack 仅作为能量激发的信号
        piano.triggerAttack(note, Tone.now(), Math.min(1, energy));
        if (lastNote) piano.triggerRelease(lastNote, Tone.now() + 0.1);
        activeNotes.set(strokeId, note);
      }
    } else if (instruction && instruction.trigger_type === 'fluid_sustain') {
      // ... 保持流体兼容逻辑 ...
      const volume = Tone.gainToDb(instruction.volume || 0.5);
      piano.volume.setTargetAtTime(volume, Tone.now(), 0.1);
      const freq = scaleSystem.resolveFrequency(event.payload);
      const note = Tone.Frequency(freq).toNote();
      if (lastNote !== note) {
        piano.triggerAttack(note, Tone.now(), 0.1);
        if (lastNote) piano.triggerRelease(lastNote, Tone.now() + 0.1);
        activeNotes.set(strokeId, note);
      }
    }

    if (instruction) {
      statusText.value = `物理状态: ${instruction.technique} | 能量: ${instruction.physics?.energy.toFixed(4)}`;
    }
  } else if (event.state === 'end') {
    const lastNote = activeNotes.get(strokeId);
    if (lastNote) {
      // 释放主音符及关联和弦
      piano.triggerRelease(lastNote, Tone.now() + 0.5);
      activeNotes.delete(strokeId);
      
      // 释放和弦声部
      for (let i = 0; i < 5; i++) {
        const chordKey = `${strokeId}-chord-${i}`;
        if (activeNotes.has(chordKey)) {
          piano.triggerRelease(activeNotes.get(chordKey), Tone.now() + 0.8);
          activeNotes.delete(chordKey);
        }
      }
    }
  }
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
