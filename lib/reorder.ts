import { withTransaction } from './db';
import { HttpError } from './httpError';

export type ReorderDirection = 'up' | 'down';

export interface ReorderResult {
  moved: boolean;
  swappedWithId?: number;
}

interface SortableRow {
  id: number;
  sort_order: number;
  updated_at: Date;
}

/**
 * Swaps `sort_order` between `id` and its nearest neighbor in the requested
 * direction, inside a single transaction with row locks (`FOR UPDATE`) to
 * avoid lost updates under concurrent reordering.
 *
 * The neighbor lookup's tiebreak MUST mirror the default list ordering used
 * by `GET /api/admin/posts` and `GET /api/admin/brokers`
 * (`sort_order DESC, updated_at DESC, id DESC`) — otherwise "up"/"down"
 * would swap with a row that isn't actually adjacent on screen. This matters
 * in practice because `sort_order` defaults to 0 for all pre-existing rows,
 * so most neighbor lookups are decided entirely by the tiebreak.
 *
 * `tableName` must always be a hardcoded literal from the caller (never
 * derived from user input) — MySQL has no parameter binding for identifiers,
 * so it is interpolated directly into the SQL text.
 */
export async function reorderRow(
  tableName: 'posts' | 'brokers' | 'market_data_symbols',
  id: number,
  direction: ReorderDirection
): Promise<ReorderResult> {
  return withTransaction(async (conn) => {
    const [currentRows] = await conn.query(
      `SELECT id, sort_order, updated_at FROM \`${tableName}\` WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );
    const current = (currentRows as SortableRow[])[0];
    if (!current) {
      throw new HttpError(404, 'Record not found');
    }

    // "up" = the row immediately above in the DESC-sorted list, i.e. the
    // smallest (sort_order, updated_at, id) tuple that is still greater than
    // the current row's tuple. "down" is the mirror image.
    const neighborSql =
      direction === 'up'
        ? `SELECT id, sort_order, updated_at FROM \`${tableName}\`
           WHERE (sort_order > ?)
              OR (sort_order = ? AND updated_at > ?)
              OR (sort_order = ? AND updated_at = ? AND id > ?)
           ORDER BY sort_order ASC, updated_at ASC, id ASC LIMIT 1 FOR UPDATE`
        : `SELECT id, sort_order, updated_at FROM \`${tableName}\`
           WHERE (sort_order < ?)
              OR (sort_order = ? AND updated_at < ?)
              OR (sort_order = ? AND updated_at = ? AND id < ?)
           ORDER BY sort_order DESC, updated_at DESC, id DESC LIMIT 1 FOR UPDATE`;

    const [neighborRows] = await conn.query(neighborSql, [
      current.sort_order,
      current.sort_order,
      current.updated_at,
      current.sort_order,
      current.updated_at,
      id,
    ]);
    const neighbor = (neighborRows as SortableRow[])[0];

    if (!neighbor) {
      return { moved: false };
    }

    await conn.query(`UPDATE \`${tableName}\` SET sort_order = ? WHERE id = ?`, [neighbor.sort_order, id]);
    await conn.query(`UPDATE \`${tableName}\` SET sort_order = ? WHERE id = ?`, [current.sort_order, neighbor.id]);

    return { moved: true, swappedWithId: neighbor.id };
  });
}
