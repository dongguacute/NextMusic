export interface InputAction {
  t: number;
  type: "trigger";
  unit: string;
}

export interface InputParams {
  energy: number;
  density: number;
}

export interface MusicInput {
  tempo: number;
  length: number;
  actions: InputAction[];
  params: InputParams;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNumber(value: unknown, fieldPath: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`"${fieldPath}" must be a number`);
  }

  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: string[],
  fieldPath: string,
) {
  const actualKeys = Object.keys(value).sort();
  const normalizedExpectedKeys = [...expectedKeys].sort();

  if (actualKeys.length !== normalizedExpectedKeys.length) {
    throw new Error(`"${fieldPath}" keys do not match, must be: ${expectedKeys.join(", ")}`);
  }

  const mismatch = actualKeys.find(
    (key, index) => key !== normalizedExpectedKeys[index],
  );

  if (mismatch) {
    throw new Error(`"${fieldPath}" keys do not match, must be: ${expectedKeys.join(", ")}`);
  }
}

function assertMusicInput(value: unknown): asserts value is MusicInput {
  if (!isRecord(value)) {
    throw new Error("input must be a record");
  }

  assertExactKeys(value, ["tempo", "length", "actions", "params"], "root");
  assertNumber(value.tempo, "tempo");
  assertNumber(value.length, "length");

  if (!Array.isArray(value.actions)) {
    throw new Error('"actions" must be an array');
  }

  value.actions.forEach((action, index) => {
    if (!isRecord(action)) {
      throw new Error(`"actions[${index}]" must be a record`);
    }

    assertExactKeys(action, ["t", "type", "unit"], `actions[${index}]`);
    assertNumber(action.t, `actions[${index}].t`);

    if (action.type !== "trigger") {
      throw new Error(`"actions[${index}].type" must be "trigger"`);
    }

    if (typeof action.unit !== "string" || action.unit.length === 0) {
      throw new Error(`"actions[${index}].unit" must be a non-empty string`);
    }
  });

  if (!isRecord(value.params)) {
    throw new Error('"params" must be a record');
  }

  assertExactKeys(value.params, ["energy", "density"], "params");
  assertNumber(value.params.energy, "params.energy");
  assertNumber(value.params.density, "params.density");
}

export function prepareInput(input: string): MusicInput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new Error(`input is not a valid JSON: ${(error as Error).message}`);
  }

  assertMusicInput(parsed);
  return parsed;
}