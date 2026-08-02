import mysql from 'mysql2/promise';

let poolInstance: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!poolInstance) {
    poolInstance = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    });
  }

  return poolInstance;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
