<template>
  <div class="voice-input-container">
    <div class="header">
      <h3>Voice Input (Mic)</h3>
      <button 
        class="toggle-btn" 
        :class="{ active: isRecording }" 
        @click="toggleMicrophone"
      >
        {{ isRecording ? 'Turn Off Microphone' : 'Turn On Microphone' }}
      </button>
    </div>

    <div class="status-panel">
      <div class="status-item">
        <span class="label">Pitch (Hz):</span>
        <span class="value">{{ currentPitch.toFixed(1) }}</span>
      </div>
      <div class="status-item">
        <span class="label">Energy:</span>
        <span class="value">{{ currentEnergy.toFixed(3) }}</span>
      </div>
    </div>

    <div class="visualizer">
      <canvas ref="canvasRef" width="400" height="150"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue';
import { useAudioEngine } from '../composables/useAudioEngine';
import type { Frame } from '@netxmusic/core';

const { injectNMEF, isReady } = useAudioEngine();

const isRecording = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const currentPitch = ref(0);
const currentEnergy = ref(0);

let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let analyserNode: AnalyserNode | null = null;
let animationFrameId: number;

const pitchHistory: number[] = [];
const MAX_HISTORY = 200;

// Simple auto-correlation pitch detection
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    let val = buf[i]!;
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // Not enough signal

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]!) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]!) < thres) { r2 = SIZE - i; break; }
  }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  let c = new Float32Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i]! + buf[j]! * buf[j + i]!;
    }
  }

  let d = 0; 
  while (c[d]! > c[d + 1]!) d++;
  
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i]! > maxval) {
      maxval = c[i]!;
      maxpos = i;
    }
  }
  let T0 = maxpos;

  let x1 = c[T0 - 1] || 0, x2 = c[T0] || 0, x3 = c[T0 + 1] || 0;
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

const processAudio = () => {
  if (!analyserNode || !audioContext || !isRecording.value) return;

  const bufferLength = analyserNode.fftSize;
  const floatTimeDomainData = new Float32Array(bufferLength);
  analyserNode.getFloatTimeDomainData(floatTimeDomainData);

  // Calculate energy (RMS)
  let sumSquares = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = floatTimeDomainData[i] || 0;
    sumSquares += val * val;
  }
  const rms = Math.sqrt(sumSquares / bufferLength);
  const energy = Math.min(1, rms * 5); // Scale up a bit for better mapping

  // Detect pitch
  let pitch = autoCorrelate(floatTimeDomainData, audioContext.sampleRate);
  if (pitch === -1) pitch = 0; // No pitch detected

  currentPitch.value = pitch;
  currentEnergy.value = energy;

  // Update history for visualization
  pitchHistory.push(pitch);
  if (pitchHistory.length > MAX_HISTORY) {
    pitchHistory.shift();
  }

  // Inject NMEF if engine is ready
  if (isReady.value) {
    const frame: Frame = {
      t: performance.now(),
      source: 'voice',
      pitch: {
        hz: pitch > 0 ? pitch : 440, // fallback to avoid 0 if needed, or keep 0
        stability: pitch > 0 ? 0.8 : 0,
        glissando: false
      },
      dynamics: {
        energy: energy,
        pressure: energy,
        attack_vel: 0
      },
      timbre: {
        brightness: 0.5,
        vibrato_depth: 0,
        formant_shift: 0
      },
      intent: {
        gesture_id: 'humming',
        active_stroke: energy > 0.05
      }
    };
    injectNMEF(frame);
  }

  drawVisualizer();

  // Throttle to roughly 60fps
  animationFrameId = requestAnimationFrame(processAudio);
};

const drawVisualizer = () => {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  
  // Draw background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < height; i += 30) {
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
  }
  ctx.stroke();

  // Draw pitch curve
  if (pitchHistory.length === 0) return;

  ctx.beginPath();
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;

  const sliceWidth = width / MAX_HISTORY;
  let x = 0;

  for (let i = 0; i < pitchHistory.length; i++) {
    const v = pitchHistory[i] || 0;
    // Map pitch (0 - 1000Hz) to canvas height
    const y = v > 0 ? height - (v / 1000) * height : height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.stroke();
};

const toggleMicrophone = async () => {
  if (isRecording.value) {
    stopRecording();
  } else {
    await startRecording();
  }
};

const startRecording = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false
      } 
    });
    
    audioContext = new AudioContext();
    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    
    sourceNode.connect(analyserNode);
    
    isRecording.value = true;
    processAudio();
  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Failed to access microphone. Please check permissions.');
  }
};

const stopRecording = () => {
  isRecording.value = false;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  
  if (analyserNode) {
    analyserNode.disconnect();
    analyserNode = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  currentPitch.value = 0;
  currentEnergy.value = 0;
  pitchHistory.length = 0;
  drawVisualizer();
};

onBeforeUnmount(() => {
  stopRecording();
});
</script>

<style scoped>
.voice-input-container {
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
  color: #fff;
  font-family: sans-serif;
  max-width: 450px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

h3 {
  margin: 0;
  font-size: 1.2rem;
}

.toggle-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.toggle-btn.active {
  background-color: #f44336;
}

.toggle-btn:hover {
  opacity: 0.9;
}

.status-panel {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  background-color: #1e1e1e;
  padding: 10px;
  border-radius: 4px;
}

.status-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.8rem;
  color: #aaa;
}

.value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #00ff88;
}

.visualizer {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #444;
}

canvas {
  display: block;
  width: 100%;
  height: 150px;
}
</style>
