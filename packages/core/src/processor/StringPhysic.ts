/**
 * StringPhysic 实现了基于物理建模的数字琴弦模型
 * 使用 Karplus-Strong 算法的变体，结合张力、阻尼和质量参数
 */
export interface StringState {
  tension: number;    // 张力 (Tension)
  damping: number;    // 阻尼 (Damping)
  mass: number;       // 质量 (Mass)
  length: number;     // 虚拟弦长 (L)
  energy: number;     // 当前能量储备
}

export class StringPhysic {
  private state: StringState;
  private lastFrequency: number = 440;

  constructor(initialState?: Partial<StringState>) {
    this.state = {
      tension: 1.0,
      damping: 0.05,
      mass: 1.0,
      length: 1.0,
      energy: 0,
      ...initialState
    };
  }

  /**
   * 物理激励 (Excitation)
   * 将外部输入的动能转化为弦的能量
   */
  public excite(velocity: number, pressure: number) {
    // 能量输入公式：E = 1/2 * m * v^2 * p
    const inputEnergy = 0.5 * this.state.mass * Math.pow(velocity, 2) * (1 + pressure);
    this.state.energy = Math.min(2.0, this.state.energy + inputEnergy);
  }

  /**
   * 更新物理状态
   * @param dt 时间增量 (秒)
   */
  public step(dt: number) {
    // 能量自然衰减：E = E * e^(-d * t)
    const decay = Math.exp(-this.state.damping * dt * 10);
    this.state.energy *= decay;

    if (this.state.energy < 0.0001) {
      this.state.energy = 0;
    }
  }

  /**
   * 计算当前物理频率
   * 公式: f = (1 / 2L) * sqrt(T / mu)
   * 其中 mu 正比于 mass
   */
  public calculateFrequency(): number {
    const { tension, mass, length } = this.state;
    // 基础常数 440Hz 对应标准状态
    const baseF = 440;
    const f = (baseF / length) * Math.sqrt(tension / mass);
    this.lastFrequency = f;
    return f;
  }

  /**
   * 获取谐波丰富度 (Harmonic Richness)
   * 能量越高，谐波越丰富
   */
  public getHarmonics(): number {
    return Math.min(1.0, this.state.energy * 2.0);
  }

  public updateParameters(params: Partial<StringState>) {
    this.state = { ...this.state, ...params };
  }

  public getState() {
    return { ...this.state };
  }
}
