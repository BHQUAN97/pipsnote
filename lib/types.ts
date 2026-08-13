export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface Broker {
  id: number;
  name: string;
  slug: string;
  type: 'forex' | 'crypto' | 'stock' | 'all';
  logo_url: string | null;
  description: string | null;
  badge: string | null;
  min_deposit: string | null;
  leverage: string | null;
  spread_from: string | null;
  affiliate_url: string | null;
  rating: number | null;
  is_active: number;
  is_featured: number;
  click_count: number;
}

export interface MarketDataSymbol {
  id: number;
  label: string;
  category: 'forex' | 'crypto' | 'commodity' | 'stock';
  decimals: number;
  is_active: number;
  sort_order: number;
  price: string | null;
  change_percent: string | null;
  direction: 'up' | 'down' | 'flat' | null;
  source: string | null;
  fetched_at: string | null;
  updated_at: string;
}

export interface MarketDataProviderConfig {
  provider_key: string;
  category: 'forex' | 'crypto' | 'commodity' | 'stock';
  is_enabled: boolean;
  requires_key: boolean;
  has_api_key: boolean;
  has_api_secret: boolean;
  updated_at: string;
}

export interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  role: 'superadmin' | 'editor' | 'author';
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  author_id: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  status: 'draft' | 'published' | 'archived';
  is_featured: number;
  view_count: number;
  read_time: number | null;
  seo_title: string | null;
  seo_desc: string | null;
  published_at: string | null;
  author_name?: string | null;
  tags?: { id: number; name: string; slug: string }[];
}

export interface PostTranslation {
  id: number;
  post_id: number;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_desc: string | null;
  status: 'draft' | 'published';
  source: 'ai' | 'human';
  translated_by: number | null;
  created_at: string;
  updated_at: string;
}
