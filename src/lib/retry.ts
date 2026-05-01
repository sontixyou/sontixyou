export const retry = async <T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number; label?: string } = {},
): Promise<T> => {
  const attempts = opts.attempts ?? 4;
  const baseMs = opts.baseMs ?? 1000;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status =
        typeof err === "object" && err !== null && "status" in err && typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : undefined;
      const code =
        typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "string"
          ? (err as { code: string }).code
          : undefined;
      const NETWORK_ERRNOS = new Set(["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ENETUNREACH"]);
      const transient =
        (status !== undefined && (status >= 500 || status === 408 || status === 429)) ||
        (code !== undefined && NETWORK_ERRNOS.has(code));
      if (!transient || i === attempts - 1) throw err;
      const delay = Math.round(baseMs * Math.pow(2, i) * (0.75 + Math.random() * 0.5));
      console.warn(
        `[${opts.label ?? "retry"}] attempt ${i + 1}/${attempts} failed (status=${status ?? "?"}); retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
};
