export function adminErrorMessage(value: unknown, fallback: string): string {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error.slice(0, 500) : fallback;
}
