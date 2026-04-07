import { InputData, validateInputData, Event, Header, ExpressionVector, Dynamics } from '../types/input';
import { EventEmitter } from 'events';

class GestureAnalyzer extends EventEmitter {
  private header: Header | null = null;
  private activeStrokes: Map<string, Event[]> = new Map();

  constructor() {
    super();
  }

  /**
   * 接收流式传入的数据片段
   * @param chunk 可以是完整的 InputData，也可以是部分更新
   */
  push(chunk: Partial<InputData>) {
    // 如果包含 header，更新当前会话上下文
    if (chunk.header) {
      this.header = chunk.header;
    }

    // 处理事件流
    if (chunk.events && chunk.events.length > 0) {
      chunk.events.forEach(event => this.processEvent(event));
    }
  }

  private processEvent(event: Event) {
    const { stroke_id, state, payload } = event;

    if (!this.activeStrokes.has(stroke_id)) {
      this.activeStrokes.set(stroke_id, []);
    }

    const history = this.activeStrokes.get(stroke_id)!;
    history.push(event);

    // 触发实时分析事件
    this.emit('gesture:update', {
      stroke_id,
      current: event,
      history: history,
      header: this.header
    });

    // 如果轨迹结束，清理内存并触发完成事件
    if (state === 'end') {
      const expression = this.calculateExpression(history);
      this.emit('gesture:complete', {
        stroke_id,
        history: history,
        header: this.header,
        expression
      });
      this.activeStrokes.delete(stroke_id);
    }
  }

  /**
   * 计算表现力向量 (Expression Vector)
   * 基于历史 dynamics 数据进行对比计算
   */
  private calculateExpression(history: Event[]): ExpressionVector {
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

  /**
   * 兼容原有的转换逻辑，并返回计算结果
   */
  transfer(data: InputData): ExpressionVector[] {
    const results: ExpressionVector[] = [];
    
    // 监听临时结果
    const onComplete = (payload: any) => {
      results.push(payload.expression);
    };
    this.on('gesture:complete', onComplete);

    this.push(data);

    // 移除监听器防止内存泄漏
    this.off('gesture:complete', onComplete);

    return results;
  }
}

export default GestureAnalyzer;