import { describe, it, expect } from 'vitest';
import { InputDataSchema } from '../types/input';

describe('Input JSON Validation', () => {
  it('should validate a correct input JSON', () => {
    const validData = {
      "header": {
        "version": "1.0",
        "timestamp": 1712485600,
        "session_id": "nm_v1_8892",
        "global_context": {
          "scale": "C-Major",
          "style_dna": "jazz-noir"
        }
      },
      "events": [
        {
          "stroke_id": "s_001",
          "state": "active",
          "payload": {
            "pitch": {
              "base_note": 60,
              "micro_offset": 12,
              "is_gliding": true
            },
            "dynamics": {
              "energy": 0.85,
              "pressure": 0.92,
              "velocity": 1.2
            },
            "spatial": {
              "x_axis": 0.45,
              "y_axis": 0.78,
              "area": 0.15
            },
            "intent": {
              "staccato_weight": 0.1,
              "vibrato_depth": 0.45
            }
          }
        }
      ]
    };

    const result = InputDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail validation for incorrect data types', () => {
    const invalidData = {
      "header": {
        "version": "1.0",
        "timestamp": "invalid_timestamp", // 应为数字
        "session_id": "nm_v1_8892",
        "global_context": {
          "scale": "C-Major",
          "style_dna": "jazz-noir"
        }
      },
      "events": []
    };

    const result = InputDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('timestamp');
    }
  });

  it('should fail validation for missing required fields', () => {
    const incompleteData = {
      "header": {
        "version": "1.0"
        // 缺少 timestamp, session_id 等
      },
      "events": []
    };

    const result = InputDataSchema.safeParse(incompleteData);
    expect(result.success).toBe(false);
  });
});
