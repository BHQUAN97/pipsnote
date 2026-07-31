import { logger } from './logger';
import { query } from './db';

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  stacktrace?: string;
  module?: string;
  requestId?: string;
  ipAddress?: string;
  userId?: number;
  url?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export async function persistLog(entry: LogEntry): Promise<void> {
  // Fire-and-forget: insert log vào DB mà không block response
  try {
    await query(
      `INSERT INTO system_logs
        (level, message, stacktrace, module, request_id, ip_address, user_id, url, method, status_code, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.level,
        entry.message,
        entry.stacktrace ?? null,
        entry.module ?? null,
        entry.requestId ?? null,
        entry.ipAddress ?? null,
        entry.userId ?? null,
        entry.url ?? null,
        entry.method ?? null,
        entry.statusCode ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  } catch (err) {
    // Không throw error ra ngoài — logging failure không được làm sập app
    logger.error({ err }, 'Failed to persist log to DB');
  }
}
