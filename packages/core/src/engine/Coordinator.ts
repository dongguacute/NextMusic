import { InputData } from '../types/Header';
import { Frame } from '../types/Frame_Stream';
import { StreamLoader } from '../library/StreamLoader';

/**
 * 输出协议：渲染指令
 */
export interface RenderCommand {
  pitch_hz: number;        // 音高 (Hz)
  layer_weights: number[]; // 采样层权重 (Array of weights)
  cutoff_hz: number;       // 滤波器截止频率 (Cutoff)
  mode: 'legato' | 'staccato' | 'none'; // 衔接类型
}

/**
 * Coordinator 配置项
 */
export interface CoordinatorConfig {
  pitch_smoothing: number; // 音高平滑系数 (0-1, 越小越平滑)
  energy_to_cutoff_base: number; // 能量到截止频率的基础映射
  energy_to_cutoff_range: number; // 能量到截止频率的动态范围
  layer_thresholds: number[]; // 采样层切换阈值，例如 [0.3, 0.7] 表示三层
}

/**
 * Coordinator 类：实现特征到参数的映射逻辑
 * 完全解耦，不依赖 DOM API，可在 Worker 中运行
 */
export class Coordinator {
  private config: CoordinatorConfig;
  private currentPitch: number = 0;
  private isFirstFrame: boolean = true;
  private loader: StreamLoader | null = null;
  
  constructor(
    private inputHeader: InputData,
    config?: Partial<CoordinatorConfig>,
    loader?: StreamLoader
  ) {
    this.config = {
      pitch_smoothing: 0.15, // 默认平滑系数
      energy_to_cutoff_base: 200,
      energy_to_cutoff_range: 8000,
      layer_thresholds: [0.33, 0.66], // 默认三层均匀分布
      ...config
    };
    this.loader = loader || null;
  }

  /**
   * 处理单帧数据，实现特征到参数的映射
   * @param frame 当前帧数据
   */
  public process(frame: Frame): RenderCommand {
    const oldPitch = this.currentPitch;

    // 1. 实现“滞后跟踪” (Lerp)
    // 处理初始帧，避免从 0 开始平滑导致的“滑入”感
    if (this.isFirstFrame) {
      this.currentPitch = frame.pitch.hz;
      this.isFirstFrame = false;
    } else {
      // 当输入的 pitch 剧烈波动时，输出的音高应该平滑追踪，产生类似真实弦乐的滑动感
      this.currentPitch = this.lerp(this.currentPitch, frame.pitch.hz, this.config.pitch_smoothing);
    }

    // 发送预判信号给 Loader
    if (this.loader && Math.abs(this.currentPitch - oldPitch) > 10) {
      const direction = this.currentPitch > oldPitch ? 1 : -1;
      this.loader.onCoordinatorSignal(this.currentPitch, direction, []);
    }

    // 2. 多层混合计算 (Gain 分布)
    const weights = this.calculateLayerWeights(frame.dynamics.energy);

    // 3. 滤波器频率映射 (基于能量动态调整亮度)
    const cutoff = this.config.energy_to_cutoff_base + (frame.dynamics.energy * this.config.energy_to_cutoff_range);

    // 4. 衔接类型判定 (基于攻击速度和持续状态)
    const mode = this.determineMode(frame);

    return {
      pitch_hz: this.currentPitch,
      layer_weights: weights,
      cutoff_hz: cutoff,
      mode: mode
    };
  }

  /**
   * 线性插值
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * 根据能量计算采样层权重
   * 实现平滑的交叉淡化 (Cross-fading)
   */
  private calculateLayerWeights(energy: number): number[] {
    const thresholds = this.config.layer_thresholds;
    const numLayers = thresholds.length + 1;
    const weights = new Array(numLayers).fill(0);

    // 寻找当前能量所在的区间
    // 例如 thresholds = [0.3, 0.7]
    // 区间 0: [0, 0.3] -> Layer 0 & 1 混合
    // 区间 1: [0.3, 0.7] -> Layer 1 & 2 混合
    // ...
    
    if (energy <= thresholds[0]) {
      const t = energy / thresholds[0];
      weights[0] = 1 - t;
      weights[1] = t;
    } else if (energy >= thresholds[thresholds.length - 1]) {
      const lastIdx = thresholds.length - 1;
      const t = (energy - thresholds[lastIdx]) / (1 - thresholds[lastIdx]);
      weights[lastIdx] = 1 - t;
      weights[lastIdx + 1] = t;
    } else {
      // 在中间层之间
      for (let i = 0; i < thresholds.length - 1; i++) {
        if (energy > thresholds[i] && energy <= thresholds[i + 1]) {
          const t = (energy - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);
          weights[i + 1] = 1 - t;
          weights[i + 2] = t;
          break;
        }
      }
    }

    return weights;
  }

  /**
   * 判定衔接类型
   */
  private determineMode(frame: Frame): 'legato' | 'staccato' | 'none' {
    // 高攻击速度触发断奏
    if (frame.dynamics.attack_vel > 0.8) {
      return 'staccato';
    }
    // 处于持续表达周期内触发连奏
    if (frame.intent.active_stroke) {
      return 'legato';
    }
    return 'none';
  }

  /**
   * 重置状态（例如在新的音符开始时）
   */
  public reset(): void {
    this.isFirstFrame = true;
    this.currentPitch = 0;
  }
}
