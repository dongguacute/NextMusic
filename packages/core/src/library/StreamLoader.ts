import { openDB, IDBPDatabase } from 'idb';

/**
 * 采样片段元数据
 */
export interface SampleChunk {
  instrumentId: string;
  sampleId: string;
  range: string; // e.g. "0-1024"
  data: ArrayBuffer;
  timestamp: number;
}

/**
 * 内存池配置
 */
export interface MemoryPoolConfig {
  maxPoolSize: number; // 最大内存池大小 (bytes)
  chunkSize: number;   // 每个 SharedArrayBuffer 的基础大小
}

/**
 * StreamLoader: 流式加载引擎
 * 负责分段加载、IndexedDB 缓存、内存池管理和 Worklet 通讯
 */
export class StreamLoader {
  private db: Promise<IDBPDatabase> | null = null;
  private readonly DB_NAME = 'NextMusic_Cache';
  private readonly STORE_NAME = 'samples';
  
  // 内存池管理
  private memoryPool: Map<string, SharedArrayBuffer> = new Map();
  private poolUsage: number = 0;
  private maxPoolSize: number = 256 * 1024 * 1024; // 默认 256MB

  constructor(private config?: Partial<MemoryPoolConfig>) {
    if (config?.maxPoolSize) this.maxPoolSize = config.maxPoolSize;
    this.initDB();
  }

  private initDB() {
    if (typeof indexedDB === 'undefined') return;
    this.db = openDB(this.DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('samples')) {
          db.createObjectStore('samples', { keyPath: ['instrumentId', 'sampleId', 'range'] });
        }
      },
    });
  }

  /**
   * 加载采样片段 (带缓存逻辑)
   */
  public async loadChunk(instrumentId: string, sampleId: string, url: string, range: string): Promise<ArrayBuffer> {
    // 1. 尝试从 IndexedDB 获取
    const cached = await this.getFromCache(instrumentId, sampleId, range);
    if (cached) return cached;

    // 2. HTTP Range 请求加载
    const data = await this.fetchRange(url, range);

    // 3. 写入缓存 (异步，不阻塞返回)
    this.saveToCache(instrumentId, sampleId, range, data);

    return data;
  }

  /**
   * 预加载 Header (前 N 字节)
   */
  public async preloadHeader(instrumentId: string, sampleId: string, url: string, headerSize: number = 32768): Promise<ArrayBuffer> {
    const range = `0-${headerSize - 1}`;
    return this.loadChunk(instrumentId, sampleId, url, range);
  }

  /**
   * 获取 SharedArrayBuffer 内存块
   */
  public getSharedBuffer(id: string, size: number): SharedArrayBuffer {
    if (this.memoryPool.has(id)) {
      return this.memoryPool.get(id)!;
    }

    // 简单的内存回收逻辑：如果超过最大限制，清空最旧的
    if (this.poolUsage + size > this.maxPoolSize) {
      this.evictOldestMemory();
    }

    const sab = new SharedArrayBuffer(size);
    this.memoryPool.set(id, sab);
    this.poolUsage += size;
    return sab;
  }

  /**
   * 释放内存块
   */
  public releaseBuffer(id: string) {
    const sab = this.memoryPool.get(id);
    if (sab) {
      this.poolUsage -= sab.byteLength;
      this.memoryPool.delete(id);
    }
  }

  /**
   * 与 AudioWorklet 通讯：发送解码后的数据
   */
  public postToWorklet(port: MessagePort, type: string, payload: any) {
    port.postMessage({ type, payload });
  }

  /**
   * 按需加载逻辑：基于 Coordinator 信号
   * @param currentPitch 当前音高
   * @param direction 移动方向 (1 为向高音，-1 为向低音)
   */
  public onCoordinatorSignal(currentPitch: number, direction: number, neighborSamples: string[]) {
    // 优先加载移动方向上的采样
    console.log(`[StreamLoader] Predictive loading for pitch: ${currentPitch}, direction: ${direction}`);
    // 实现具体的预加载策略...
  }

  private async fetchRange(url: string, range: string): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        'Range': `bytes=${range}`
      }
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch range ${range} from ${url}`);
    }

    return await response.arrayBuffer();
  }

  private async getFromCache(instrumentId: string, sampleId: string, range: string): Promise<ArrayBuffer | null> {
    if (!this.db) return null;
    const db = await this.db;
    const item = await db.get(this.STORE_NAME, [instrumentId, sampleId, range]);
    return item ? item.data : null;
  }

  private async saveToCache(instrumentId: string, sampleId: string, range: string, data: ArrayBuffer) {
    if (!this.db) return;
    const db = await this.db;
    await db.put(this.STORE_NAME, {
      instrumentId,
      sampleId,
      range,
      data,
      timestamp: Date.now()
    });
  }

  private evictOldestMemory() {
    // 简单的 FIFO 或 LRU 策略
    const firstKey = this.memoryPool.keys().next().value;
    if (firstKey) {
      this.releaseBuffer(firstKey);
    }
  }
}
