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
}
