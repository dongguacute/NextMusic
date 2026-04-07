import { Event, ExpressionVector } from '../types/input';

/**
 * Articulation 类负责分析演奏的断句和表现力
 * 迁移自 GestureAnalyzer 的表现力计算逻辑
 */
export class Articulation {
  /**
   * 计算表现力向量 (Expression Vector)
   * 基于历史 dynamics 数据进行对比计算
   */
  public static calculateExpression(history: Event[]): ExpressionVector {
    if (history.length === 0) {
      return { energy: 0, instability: 0, aggression: 0, coherence: 0 };
    }

    const dynamicsList = history.map(e => e.payload.dynamics);
    const count = dynamicsList.length;

    // 1. 能量 (Energy): 平均能量强度
    const avgEnergy = dynamicsList.reduce((sum, d) => sum + d.energy, 0) / count;

    // 2. 不稳定度 (Instability): 能量和压力的标准差/波动程度
    let energyVariance = 0;
    if (count > 1) {
      energyVariance = dynamicsList.reduce((sum, d) => sum + Math.pow(d.energy - avgEnergy, 2), 0) / (count - 1);
    }
    const instability = Math.min(Math.sqrt(energyVariance) * 2, 1); // 归一化处理

    // 3. 攻击性 (Aggression): 初始速度和压力变化率
    const firstDynamics = dynamicsList[0];
    const initialVelocity = firstDynamics.velocity;
    // 简单的攻击性估算：初始速度 + 压力增长最快的部分
    let maxPressureDiff = 0;
    for (let i = 1; i < dynamicsList.length; i++) {
      maxPressureDiff = Math.max(maxPressureDiff, dynamicsList[i].pressure - dynamicsList[i - 1].pressure);
    }
    const aggression = Math.min((initialVelocity / 127) * 0.5 + maxPressureDiff * 0.5, 1);

    // 4. 连贯性 (Coherence): 能量变化的平滑度 (1 - 突变程度)
    let totalJerk = 0;
    if (count > 1) {
      for (let i = 1; i < dynamicsList.length; i++) {
        totalJerk += Math.abs(dynamicsList[i].energy - dynamicsList[i - 1].energy);
      }
      totalJerk /= (count - 1);
    }
    const coherence = Math.max(1 - totalJerk * 2, 0);

    return {
      energy: avgEnergy,
      instability,
      aggression,
      coherence
    };
  }
}
