import { RenderCommand } from '../engine/Coordinator';

/**
 * Articulation 处理后的输出指令，包含交叉淡入淡出信息和缓冲区预热状态
 */
export interface ArticulationResult {
  pitch_hz: number;
  layers: {
    index: number;
    gain: number;
    is_prewarming: boolean;
  }[];
  crossfade_duration_ms: number;
  apply_agc: boolean;
}

export class Articulation {
  private lastPitch: number = 0;
  private sampleRate: number = 44100;
  private maxGain: number = 1.0;
  private currentGain: number = 1.0; // 用于平滑增益控制
  private agcThreshold: number = 0.95; // 触发 AGC 的阈值

  constructor(private config: { sampleRate?: number; maxGain?: number; agcThreshold?: number } = {}) {
    this.sampleRate = config.sampleRate || 44100;
    this.maxGain = config.maxGain || 1.0;
    this.agcThreshold = config.agcThreshold || 0.95;
  }

  /**
   * 处理渲染指令，计算交叉淡入淡出和预热逻辑
   */
  public process(command: RenderCommand, is_new_stroke: boolean): ArticulationResult {
    const pitchChanged = Math.abs(command.pitch_hz - this.lastPitch) > 0.1;
    
    // 1. 动态力度层切换 (Crossfade Layer)
    const layers = this.calculateCrossfadeLayers(command.layer_weights);

    // 2. 缓冲区预热逻辑 (Buffer Pre-warming)
    // 当检测到 pitch 发生变化但 is_new_stroke 为 false 时，提前准备下一个音的采样
    let crossfadeDuration = 0;
    if (pitchChanged && !is_new_stroke) {
      // 计算 20ms-50ms 的重叠区
      crossfadeDuration = this.calculateAdaptiveCrossfade(command.pitch_hz);
    }

    // 3. 状态保护 (AGC)
    // 在切换采样瞬间应用小规模的 Gain 自动增益控制，防止 Clipping
    const totalGain = layers.reduce((sum, l) => sum + l.gain, 0);
    const shouldApplyAGC = totalGain > this.agcThreshold;
    
    if (shouldApplyAGC) {
      // 动态调整增益：如果总增益超过阈值，则按比例缩小所有层的增益
      const scaleFactor = this.agcThreshold / totalGain;
      layers.forEach(l => {
        l.gain *= scaleFactor;
      });
      this.currentGain = this.agcThreshold;
    } else {
      this.currentGain = totalGain;
    }

    this.lastPitch = command.pitch_hz;

    return {
      pitch_hz: command.pitch_hz,
      layers: layers.map(l => ({
        ...l,
        is_prewarming: pitchChanged && !is_new_stroke // 标记是否处于预热状态
      })),
      crossfade_duration_ms: crossfadeDuration,
      apply_agc: shouldApplyAGC
    };
  }

  /**
   * 实现 CrossfadeLayer 函数：动态力度层切换
   * 使用等功率交叉淡化曲线 (Equal Power Crossfade) 确保能量平滑
   */
  private calculateCrossfadeLayers(weights: number[]) {
    return weights.map((weight, index) => {
      // 使用 Math.sqrt(weight) 实现等功率增益，避免中间点音量塌陷
      const gain = Math.sqrt(weight) * this.maxGain;
      return {
        index,
        gain,
        is_prewarming: false
      };
    });
  }

  /**
   * 计算自适应交叉淡化时长 (20ms - 50ms)
   * 基于音高变化幅度或频率进行调整
   */
  private calculateAdaptiveCrossfade(currentPitch: number): number {
    // 基础逻辑：音高越高，周期越短，可以使用更短的 crossfade
    // 这里简单实现一个 20-50ms 的映射
    const base = 20;
    const range = 30;
    // 假设 100Hz - 1000Hz 映射到 50ms - 20ms
    const factor = Math.max(0, Math.min(1, (currentPitch - 100) / 900));
    return base + (1 - factor) * range;
  }

  /**
   * 状态保护：检测是否可能发生音频剪裁 (Clipping)
   * 已经被内联到 process 中，保留作为辅助参考或未来扩展
   */
  private detectPotentialClipping(layers: { gain: number }[]): boolean {
    const totalGain = layers.reduce((sum, l) => sum + l.gain, 0);
    return totalGain > this.agcThreshold;
  }
}
