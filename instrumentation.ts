// Record render failures without request headers, user identities or form data.
export function onRequestError(error: unknown, request: { path: string }) {
  const message = error instanceof Error ? error.message : "Unknown render error";
  const stack = error instanceof Error ? error.stack?.split("\n").slice(1, 5).join("\n") : "";
  const redact = (value: string) => value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]");
  console.error("[YUNT render]", request.path.split("?")[0], redact(message.slice(0, 400)), redact(stack ?? ""));
}
