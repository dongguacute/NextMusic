import { Event } from '../types/input';

/**
 * FrictionAnalyzer 负责根据压力和移动速度计算“摩擦能量”。
 * 公式: F = Pressure * Movement_Speed
 * 包含能量衰减逻辑（模拟弓停声消）和 EMA 平滑处理。
 */
export class FrictionAnalyzer {
  private lastEvent: Event | null = null;
  private smoothedEnergy: number = 0;
  private readonly emaAlpha: number; // EMA 平滑系数 (0-1)，越小越平滑
  private readonly decayRate: number; // 能量衰减率 (0-1)

  constructor(options: { emaAlpha?: number; decayRate?: number } = {}) {
    this.emaAlpha = options.emaAlpha ?? 0.2;
    this.decayRate = options.decayRate ?? 0.9; // 默认衰减较快
  }

  /**
   * 计算当前事件的摩擦能量并进行平滑处理
   * @param currentEvent 当前 NMEF 事件
   * @param deltaTime 两次事件之间的时间间隔 (ms)
   */
  public calculate(currentEvent: Event, deltaTime: number): number {
    const { pressure } = currentEvent.payload.dynamics;
    const { x_axis: x, y_axis: y } = currentEvent.payload.spatial;

    let instantaneousEnergy = 0;

    if (this.lastEvent && deltaTime > 0) {
      const prevX = this.lastEvent.payload.spatial.x_axis;
      const prevY = this.lastEvent.payload.spatial.y_axis;

      // 计算移动距离 (欧几里得距离)
      const distance = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
      
      // 计算移动速度 (距离 / 时间)
      const speed = distance / (deltaTime / 1000); // 单位: 距离单位/秒

      // 力度 F = Pressure * Movement_Speed
      instantaneousEnergy = pressure * speed;
    }

    // 如果手指不动或速度极低，能量衰减
    if (instantaneousEnergy < 0.001) {
      this.smoothedEnergy *= this.decayRate;
    } else {
      // EMA (指数移动平均) 处理：Output = Alpha * Input + (1 - Alpha) * LastOutput
      this.smoothedEnergy = (this.emaAlpha * instantaneousEnergy) + ((1 - this.emaAlpha) * this.smoothedEnergy);
    }

    this.lastEvent = currentEvent;
    
    // 限制能量范围在合理区间 (例如 0-2，具体取决于速度定义)
    return Math.max(0, this.smoothedEnergy);
  }

  /**
   * 重置分析器状态 (新轨迹开始时调用)
   */
  public reset() {
    this.lastEvent = null;
    this.smoothedEnergy = 0;
  }
}
