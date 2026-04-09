import { z } from 'zod';

/**
 * 音乐输入上下文的 Scale 配置验证
 */
export const ScaleSchema = z.object({
  root: z.string().describe('根音，例如 "C"'),
  mode: z.string().describe('调式，例如 "aeolian"'),
  quantize_level: z.number().min(0).max(1).describe('量化级别 0-1'),
  allow_microtonal: z.boolean().describe('是否允许微调音'),
});

/**
 * 音乐输入上下文验证
 */
export const InputContextSchema = z.object({
  instrument_id: z.string().describe('乐器 ID'),
  style_preset: z.string().describe('风格预设'),
  scale: ScaleSchema,
  sample_rate: z.number().positive().describe('采样率'),
  frame_ms: z.number().positive().describe('帧长度(毫秒)'),
});

/**
 * 完整的输入数据验证 Schema
 */
export const InputDataSchema = z.object({
  version: z.string().describe('版本号'),
  session_id: z.string().describe('会话 ID'),
  context: InputContextSchema,
});

// 导出类型定义
export type Scale = z.infer<typeof ScaleSchema>;
export type InputContext = z.infer<typeof InputContextSchema>;
export type InputData = z.infer<typeof InputDataSchema>;

/**
 * 验证输入数据的辅助函数
 */
export function validateInputData(data: unknown): InputData {
  return InputDataSchema.parse(data);
}

/**
 * 安全验证输入数据的辅助函数（不抛出异常）
 */
export function safeValidateInputData(data: unknown) {
  return InputDataSchema.safeParse(data);
}
