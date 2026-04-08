import { InputData, Event, Header, IGestureAnalyzer, GestureEvents } from '../types/input';
import { Articulation } from './Articulation';
import { FrictionAnalyzer } from './FrictionAnalyzer';

/**
 * 简单的 EventEmitter 实现，避免 Node.js 依赖
 */
export class SimpleEventEmitter implements IGestureAnalyzer {
  private listeners: { [key: string]: Function[] } = {};

  on<K extends keyof GestureEvents>(event: K, listener: GestureEvents[K]): this {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(listener);
    return this;
  }

  off<K extends keyof GestureEvents>(event: K, listener: GestureEvents[K]): this {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    return this;
  }

  emit<K extends keyof GestureEvents>(event: K, ...args: Parameters<GestureEvents[K]>): boolean {
    if (!this.listeners[event]) return false;
    this.listeners[event].forEach(l => l(...args));
    return true;
  }
}

/**
 * DefaultGestureAnalyzer 负责接收原始的 PointerEvent，
 * 将其转换为 NMEF 格式，并触发相应事件。
 */
export class DefaultGestureAnalyzer extends SimpleEventEmitter {
  private header: Header | null = null;
  private activeStrokes: Map<string, Event[]> = new Map();
  private frictionAnalyzers: Map<string, FrictionAnalyzer> = new Map();
  private lastTimestamps: Map<string, number> = new Map();

  constructor(initialHeader?: Header) {
    super();
    if (initialHeader) {
      this.header = initialHeader;
    }
  }

  /**
   * 设置会话上下文
   */
  public setHeader(header: Header) {
    this.header = header;
  }

  /**
   * 处理原始 PointerEvent 并转换为 NMEF Event
   * @param pointerEvent 浏览器原始指针事件
   * @param state 事件状态 ('active' | 'end')
   * @param strokeId 轨迹唯一 ID
   * @param options 额外的映射选项（如坐标转换）
   */
  public handlePointer(
    pointerEvent: PointerEvent,
    state: 'active' | 'end',
    strokeId: string,
    options: {
      rect?: DOMRect;
      energy?: number;
      pressure?: number;
    } = {}
  ): Event {
    const { rect, energy = 0.5, pressure = pointerEvent.pressure || 0.5 } = options;
    
    let x = pointerEvent.clientX;
    let y = pointerEvent.clientY;

    if (rect) {
      x = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      y = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
    } else {
      // 如果没有 rect，则相对于窗口
      x = x / (typeof window !== 'undefined' ? window.innerWidth : 1);
      y = y / (typeof window !== 'undefined' ? window.innerHeight : 1);
    }

    const nmefEvent: Event = {
      stroke_id: strokeId,
      state,
      payload: {
        pitch: {
          base_note: 48 + Math.floor(x * 36), // 默认映射 3 个八度
          micro_offset: (x * 36 % 1) * 100,
          is_gliding: true
        },
        dynamics: {
          energy: energy,
          pressure: pressure,
          friction_energy: 0 // 初始值，稍后更新
        },
        spatial: {
          x_axis: x,
          y_axis: y,
          area: 0.1
        },
        intent: {
          staccato_weight: 0,
          vibrato_depth: 0.1
        }
      }
    };

    this.processEvent(nmefEvent);
    return nmefEvent;
  }

  /**
   * 内部处理 NMEF 事件流
   */
  private processEvent(event: Event) {
    const { stroke_id, state } = event;

    if (!this.activeStrokes.has(stroke_id)) {
      this.activeStrokes.set(stroke_id, []);
    }

    const history = this.activeStrokes.get(stroke_id)!;
    
    // 计算摩擦能量
    if (!this.frictionAnalyzers.has(stroke_id)) {
      this.frictionAnalyzers.set(stroke_id, new FrictionAnalyzer());
      this.lastTimestamps.set(stroke_id, Date.now());
    }
    
    const analyzer = this.frictionAnalyzers.get(stroke_id)!;
    const lastTime = this.lastTimestamps.get(stroke_id) || Date.now();
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    
    const frictionEnergy = analyzer.calculate(event, deltaTime);
    event.payload.dynamics.friction_energy = frictionEnergy;
    // 同时更新总体能量，使其反映摩擦能量
    event.payload.dynamics.energy = Math.min(1, frictionEnergy); 

    this.lastTimestamps.set(stroke_id, currentTime);
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
      this.frictionAnalyzers.delete(stroke_id);
      this.lastTimestamps.delete(stroke_id);
    }
  }
}
