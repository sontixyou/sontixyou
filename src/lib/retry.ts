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
      const status = (err as { status?: number })?.status;
      const transient = status === undefined || status >= 500 || status === 408 || status === 429;
      if (!transient || i === attempts - 1) throw err;
      const delay = baseMs * Math.pow(2, i);
      console.warn(
        `[${opts.label ?? "retry"}] attempt ${i + 1}/${attempts} failed (status=${status ?? "?"}); retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
};
