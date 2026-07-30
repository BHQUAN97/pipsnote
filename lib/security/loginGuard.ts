// Login protection: track failures, block IP after threshold

export interface LoginFailure {
  ip: string;
  username?: string;
  failedAt: Date;
}

const FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10 phút
const MAX_FAILURES = 10;
const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 giờ

// TODO: Thay bằng DB queries khi có mysql2 pool
const failureCache = new Map<string, LoginFailure[]>();
const blockCache = new Map<string, Date>();

export async function recordLoginFailure(ip: string, username?: string): Promise<void> {
  const now = new Date();
  const failures = failureCache.get(ip) || [];

  // Lọc failures cũ hơn 10 phút
  const recentFailures = failures.filter(
    (f) => now.getTime() - f.failedAt.getTime() < FAILURE_WINDOW_MS
  );

  recentFailures.push({ ip, username, failedAt: now });
  failureCache.set(ip, recentFailures);

  // Nếu >= MAX_FAILURES → block IP
  if (recentFailures.length >= MAX_FAILURES) {
    const blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
    blockCache.set(ip, blockedUntil);

    // TODO: Insert vào ip_blocks table
    console.warn(`IP blocked: ${ip} until ${blockedUntil.toISOString()}`);
  }
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const blockedUntil = blockCache.get(ip);
  if (!blockedUntil) return false;

  if (new Date() < blockedUntil) {
    return true;
  } else {
    // Hết hạn block → xóa cache
    blockCache.delete(ip);
    return false;
  }
}

export async function clearLoginFailures(ip: string): Promise<void> {
  failureCache.delete(ip);
}
