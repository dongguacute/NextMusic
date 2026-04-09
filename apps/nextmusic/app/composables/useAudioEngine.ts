import { ref, onBeforeUnmount } from 'vue';
import { Coordinator, StreamLoader, type Frame } from '@netxmusic/core';

// 全局单例，防止 HMR 导致多个 AudioContext 冲突
let audioContext: AudioContext | null = null;
let coordinator: Coordinator | null = null;
let streamLoader: StreamLoader | null = null;
let isInitialized = false;

// 响应式状态（全局共享或每次调用独立，这里使用全局共享保证状态一致）
const isReady = ref(false);
const volume = ref(1);
const analyzerData = ref<Uint8Array>(new Uint8Array(0));
const loadingProgress = ref(0);

// 采样库 Manifest 类型
interface SampleManifest {
  instruments: Array<{
    id: string;
    samples: Array<{
      id: string;
      url: string;
    }>;
  }>;
}

export function useAudioEngine() {
  let analyzerNode: AnalyserNode | null = null;
  let gainNode: GainNode | null = null;
  let animationFrameId: number;

  const initEngine = async () => {
    if (typeof window === 'undefined') return; // 仅客户端初始化
    if (isInitialized && audioContext) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      return;
    }

    try {
      // 1. 实例化 AudioContext
      audioContext = new AudioContext();
      
      // 2. 异步加载 AudioWorklet
      // 注意：实际构建时可能需要使用 .js 后缀或特定的 Vite 插件处理
      await audioContext.audioWorklet.addModule('/worklets/AudioWorklet.js').catch(async () => {
        // Fallback to .ts if using Vite dev server directly
        if (audioContext) {
          await audioContext.audioWorklet.addModule('/worklets/AudioWorklet.ts');
        }
      });

      // 3. 实例化 StreamLoader 和 Coordinator
      streamLoader = new StreamLoader();
      
      // 构造默认 Header
      const defaultHeader = {
        version: '1.0',
        session_id: 'default-session',
        context: {
          instrument_id: 'default',
          style_preset: 'default',
          scale: {
            root: 'C',
            mode: 'aeolian',
            quantize_level: 0,
            allow_microtonal: true
          },
          sample_rate: audioContext.sampleRate,
          frame_ms: 10
        }
      };
      
      coordinator = new Coordinator(defaultHeader, undefined, streamLoader);

      // 4. 设置音频路由
      gainNode = audioContext.createGain();
      gainNode.gain.value = volume.value;
      
      analyzerNode = audioContext.createAnalyser();
      analyzerNode.fftSize = 2048;
      
      // 在实际应用中，这里需要将 WorkletNode 连接到 gainNode
      // const workletNode = new AudioWorkletNode(audioContext, 'nextmusic-processor');
      // workletNode.connect(gainNode);
      
      gainNode.connect(analyzerNode);
      analyzerNode.connect(audioContext.destination);

      // 启动频谱分析循环
      startAnalyzerLoop();

      isInitialized = true;
      isReady.value = true;

      // 5. 预加载采样数据
      await preloadSamples();

    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      isReady.value = false;
    }
  };

  const preloadSamples = async () => {
    if (!streamLoader) return;
    
    try {
      // 读取 manifest.json
      const response = await fetch('/samples/manifest.json');
      if (!response.ok) {
        console.warn('Manifest not found, skipping preload.');
        return;
      }
      
      const manifest: SampleManifest = await response.json();
      let totalSamples = 0;
      let loadedSamples = 0;

      // 计算总数
      manifest.instruments.forEach(inst => {
        totalSamples += inst.samples.length;
      });

      if (totalSamples === 0) return;

      // 遍历预加载前 200KB
      const PRELOAD_SIZE = 200 * 1024; // 200KB
      
      for (const inst of manifest.instruments) {
        for (const sample of inst.samples) {
          try {
            await streamLoader.preloadHeader(inst.id, sample.id, sample.url, PRELOAD_SIZE);
          } catch (e) {
            console.warn(`Failed to preload sample ${sample.id}:`, e);
          } finally {
            loadedSamples++;
            loadingProgress.value = Math.round((loadedSamples / totalSamples) * 100);
          }
        }
      }
    } catch (error) {
      console.error('Error during sample preloading:', error);
    }
  };

  const injectNMEF = (data: Frame) => {
    if (!isReady.value || !coordinator) {
      console.warn('AudioEngine is not ready or Coordinator is missing.');
      return;
    }
    
    // 将实时交互数据推入 Coordinator
    const renderCommand = coordinator.process(data);
    
    // 在实际应用中，这里需要将 renderCommand 发送给 AudioWorkletNode
    // workletNode.port.postMessage({ type: 'render', payload: renderCommand });
  };

  const startAnalyzerLoop = () => {
    if (!analyzerNode) return;
    
    const updateData = () => {
      if (analyzerNode) {
        const dataArray = new Uint8Array(analyzerNode.frequencyBinCount);
        analyzerNode.getByteFrequencyData(dataArray);
        analyzerData.value = dataArray;
      }
      animationFrameId = requestAnimationFrame(updateData);
    };
    
    updateData();
  };

  onBeforeUnmount(() => {
    // 仅清理当前组件相关的资源，不销毁全局单例以支持 HMR
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  return {
    isReady,
    volume,
    analyzerData,
    loadingProgress,
    initEngine,
    injectNMEF
  };
}
