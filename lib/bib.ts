export function normalizeBibNumber(value: string) {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed) {
    return "";
  }

  if (!/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (Number.isNaN(parsed)) {
    return trimmed;
  }

  return parsed.toString().padStart(Math.max(4, parsed.toString().length), "0");
}
