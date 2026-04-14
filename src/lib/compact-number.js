const COMPACT_NUMBER_MULTIPLIERS = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

const COMPACT_NUMBER_EXAMPLE = "Use a number like 1000, 1k, 2.5m, or 3b.";

export function parseCompactNumber(value) {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 0) {
      return { value };
    }

    return { error: COMPACT_NUMBER_EXAMPLE };
  }

  if (typeof value !== "string") {
    return { error: COMPACT_NUMBER_EXAMPLE };
  }

  const normalizedValue = value.trim().toLowerCase().replaceAll(",", "");
  const match = normalizedValue.match(/^(\d+(?:\.\d+)?|\.\d+)\s*([kmb])?$/i);

  if (!match) {
    return { error: COMPACT_NUMBER_EXAMPLE };
  }

  const baseValue = Number(match[1]);
  const suffix = match[2]?.toLowerCase();
  const multiplier = suffix ? COMPACT_NUMBER_MULTIPLIERS[suffix] : 1;
  const parsedValue = baseValue * multiplier;

  if (!Number.isFinite(parsedValue)) {
    return { error: COMPACT_NUMBER_EXAMPLE };
  }

  return { value: parsedValue };
}

export function parseCompactOption(options, optionName, label) {
  const option = options.find((entry) => entry.name === optionName);

  if (!option || option.value == null || option.value === "") {
    return { missing: true };
  }

  const parsed = parseCompactNumber(option.value);
  if (parsed.error) {
    return { error: `${label} must be valid. ${COMPACT_NUMBER_EXAMPLE}` };
  }

  return parsed;
}