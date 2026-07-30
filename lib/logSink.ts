import { logger } from './logger';

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
  metadata?: Record<string, any>;
}

export async function persistLog(entry: LogEntry): Promise<void> {
  // Fire-and-forget: insert log vào DB mà không block response
  try {
    // TODO: Khi có mysql2 pool setup, insert vào system_logs
    // const conn = await pool.getConnection();
    // await conn.query('INSERT INTO system_logs SET ?', entry);
    // conn.release();

    // Tạm log ra console trong dev
    logger.info({ ...entry }, 'Log persisted (DB insert pending)');
  } catch (err) {
    // Không throw error ra ngoài — logging failure không được làm sập app
    logger.error({ err }, 'Failed to persist log to DB');
  }
}
