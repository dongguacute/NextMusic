<template>
  <div class="app-container">
    <!-- 流体交互画布作为底层背景 -->
    <FluidStage />
    
    <div class="content-overlay">
      <h1 class="title">NextMusic</h1>
      
      <!-- 引擎初始化状态与控制 -->
      <div class="engine-controls">
        <button 
          v-if="!isReady" 
          class="start-btn" 
          @click="initEngine"
        >
          点击启动音频引擎
        </button>
        <div v-else class="status">
          <span class="ready-badge">引擎已就绪</span>
          <span v-if="loadingProgress > 0 && loadingProgress < 100" class="loading">
            音色正在呼吸... {{ loadingProgress }}%
          </span>
        </div>
      </div>

      <!-- 哼唱捕捉组件 -->
      <div class="voice-input-wrapper">
        <VoiceInput />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAudioEngine } from '../composables/useAudioEngine';

const { isReady, loadingProgress, initEngine } = useAudioEngine();
</script>

<style scoped>
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #000;
  color: #fff;
  font-family: sans-serif;
}

.content-overlay {
  position: relative;
  z-index: 20; /* 确保在 FluidStage (z-index: 10) 之上 */
  padding: 2rem;
  pointer-events: none; /* 让底层 Canvas 可以接收滑动手势事件 */
}

/* 恢复内部元素的交互，否则按钮无法点击 */
.engine-controls, .voice-input-wrapper {
  pointer-events: auto;
}

.title {
  font-size: 3rem;
  margin: 0 0 1rem 0;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.engine-controls {
  margin-bottom: 2rem;
}

.start-btn {
  padding: 12px 24px;
  font-size: 1.2rem;
  background-color: #00ff88;
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s, background-color 0.2s;
}

.start-btn:hover {
  transform: scale(1.05);
  background-color: #33ff99;
}

.status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ready-badge {
  background-color: rgba(0, 255, 136, 0.2);
  color: #00ff88;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #00ff88;
  font-size: 0.9rem;
}

.loading {
  color: #aaa;
  font-style: italic;
  font-size: 0.9rem;
}

.voice-input-wrapper {
  margin-top: 2rem;
}
</style>
