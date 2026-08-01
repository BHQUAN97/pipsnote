import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';

interface PostStatusCount {
  status: 'draft' | 'published' | 'archived';
  total: number;
}

interface TopPost {
  id: number;
  title: string;
  view_count: number;
}

interface TopBroker {
  id: number;
  name: string;
  click_count: number;
}

interface ClickTrendRow {
  day: string;
  total: number;
}

async function getHandler() {
  await requireAdmin(['superadmin', 'editor']);

  const [postStatusCounts, activeBrokerCount, topPosts, topBrokers, clickTrend, recentErrorCount] =
    await Promise.all([
      query<PostStatusCount[]>(
        `SELECT status, COUNT(*) AS total FROM posts GROUP BY status`
      ),
      query<{ total: number }[]>(
        `SELECT COUNT(*) AS total FROM brokers WHERE is_active = 1`
      ),
      query<TopPost[]>(
        `SELECT id, title, view_count FROM posts ORDER BY view_count DESC LIMIT 5`
      ),
      query<TopBroker[]>(
        `SELECT id, name, click_count FROM brokers ORDER BY click_count DESC LIMIT 5`
      ),
      query<ClickTrendRow[]>(
        `SELECT DATE(clicked_at) AS day, COUNT(*) AS total
         FROM affiliate_clicks
         WHERE clicked_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
         GROUP BY DATE(clicked_at)
         ORDER BY day ASC`
      ),
      query<{ total: number }[]>(
        `SELECT COUNT(*) AS total FROM system_logs
         WHERE level IN ('error', 'fatal') AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      ),
    ]);

  const postsByStatus = { draft: 0, published: 0, archived: 0 };
  for (const row of postStatusCounts) {
    postsByStatus[row.status] = row.total;
  }

  return NextResponse.json({
    postsByStatus,
    activeBrokerCount: activeBrokerCount[0]?.total ?? 0,
    topPosts,
    topBrokers,
    clickTrend,
    recentErrorCount: recentErrorCount[0]?.total ?? 0,
  });
}

export const GET = withApiHandler('admin-dashboard', getHandler);
