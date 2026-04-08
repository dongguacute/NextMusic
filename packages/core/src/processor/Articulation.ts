import { Event, ExpressionVector, ArticulationResult, ArticulationType } from '../types/input';

/**
 * Articulation 类负责分析演奏的断句和表现力
 * 迁移自 GestureAnalyzer 的表现力计算逻辑
 */
export class Articulation {
  // 阈值配置
  private static readonly LEGATO_TIME_THRESHOLD = 50; // 毫秒，判定为连奏的时间间隔
  private static readonly ATTACK_ENERGY_THRESHOLD = 0.8; // 能量阈值，判定为重击
  private static readonly ATTACK_VELOCITY_THRESHOLD = 100; // 速度阈值
  private static readonly LEGATO_PITCH_THRESHOLD = 12; // 半音，判定为连奏的音程间隔 (一个八度内)

  /**
   * 分析当前事件相对于历史事件的衔接类型
   * @param currentEvent 当前触发的事件
   * @param lastEvent 上一个触发的事件
   * @param timestamp 当前时间戳
   * @param lastTimestamp 上一个事件的时间戳
   */
  public static analyze(
    currentEvent: Event,
    lastEvent: Event | null,
    timestamp: number,
    lastTimestamp: number | null
  ): ArticulationResult {
    const expression = this.calculateExpression([currentEvent]);
    let type: ArticulationType = 'None';
    let weight = 0;

    // 1. 检测 Legato (连奏)
    // 逻辑：监测相邻两个音的 Time 和 Pitch 间隔。如果间隔极短，它会强行触发采样库里的 Legato 切片
    if (lastEvent && lastTimestamp !== null) {
      const timeDiff = timestamp - lastTimestamp;
      const pitchDiff = Math.abs(currentEvent.payload.pitch.base_note - lastEvent.payload.pitch.base_note);
      
      // 核心：检查 stroke_id 是否一致。如果 stroke_id 改变，说明是新的拨弦/按键，可能触发 Legato
      // 如果 stroke_id 没变，说明是同一个音的持续调制（如推弦），不应触发 Legato 衔接采样
      const isNewStroke = currentEvent.stroke_id !== lastEvent.stroke_id;

      if (isNewStroke && timeDiff < this.LEGATO_TIME_THRESHOLD && pitchDiff <= this.LEGATO_PITCH_THRESHOLD) {
        type = 'Legato';
        // 权重基于时间间隔，越短权重越高
        weight = 1 - (timeDiff / this.LEGATO_TIME_THRESHOLD);
        
        return { expression, type, weight };
      }
    }

    // 2. 检测 Attack (重击)
    // 逻辑：如果用户有一个瞬时的高能量输入，它会触发 Attack（重击）切片
    const currentDynamics = currentEvent.payload.dynamics;
    if (currentDynamics.energy > this.ATTACK_ENERGY_THRESHOLD || 
        currentDynamics.velocity > this.ATTACK_VELOCITY_THRESHOLD) {
      type = 'Attack';
      // 权重基于能量或速度的溢出程度
      const energyWeight = Math.max(0, (currentDynamics.energy - this.ATTACK_ENERGY_THRESHOLD) / (1 - this.ATTACK_ENERGY_THRESHOLD));
      const velocityWeight = Math.max(0, (currentDynamics.velocity - this.ATTACK_VELOCITY_THRESHOLD) / (127 - this.ATTACK_VELOCITY_THRESHOLD));
      weight = Math.max(energyWeight, velocityWeight);

      return { expression, type, weight };
    }

    // 3. 检测 Staccato (断奏)
    if (currentEvent.payload.intent.staccato_weight > 0.5) {
      type = 'Staccato';
      weight = currentEvent.payload.intent.staccato_weight;
    }

    return {
      expression,
      type,
      weight
    };
  }

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

    // 3. 动作补偿算法 (Action Compensation / Smoothing)
    // 如果用户动作僵硬（不连贯），自动计算平滑补偿
    let totalJerk = 0;
    if (count > 1) {
      for (let i = 1; i < dynamicsList.length; i++) {
        totalJerk += Math.abs(dynamicsList[i].energy - dynamicsList[i - 1].energy);
      }
      totalJerk /= (count - 1);
    }
    const isStiff = totalJerk > 0.15; // 判定为动作僵硬
    const smoothing = isStiff ? 200 : 0; // 自动增加 200ms 平滑

    // 4. 攻击性 (Aggression): 初始速度和压力变化率
    const firstDynamics = dynamicsList[0];
    const initialVelocity = firstDynamics.velocity;
    let maxPressureDiff = 0;
    for (let i = 1; i < dynamicsList.length; i++) {
      maxPressureDiff = Math.max(maxPressureDiff, dynamicsList[i].pressure - dynamicsList[i - 1].pressure);
    }
    const aggression = Math.min((initialVelocity / 127) * 0.5 + maxPressureDiff * 0.5, 1);

    // 5. 连贯性 (Coherence): 能量变化的平滑度 (1 - 突变程度)
    const coherence = Math.max(1 - totalJerk * 2, 0);

    return {
      energy: avgEnergy,
      instability,
      aggression,
      coherence,
      // @ts-ignore: 扩展表现力向量以包含平滑建议
      smoothing
    };
  }
}
