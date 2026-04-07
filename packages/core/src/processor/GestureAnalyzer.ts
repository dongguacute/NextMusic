import { InputData, validateInputData, Event, Header, ExpressionVector, Dynamics } from '../types/input';
import { EventEmitter } from 'events';
import { Articulation } from './Articulation';

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
      const expression = Articulation.calculateExpression(history);
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