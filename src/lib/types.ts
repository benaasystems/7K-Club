export type Lang = 'en' | 'ar';
export type Role = 'customer' | 'staff' | 'admin';
export type ResourceType = 'ps5' | 'ps4' | 'billiards' | 'ping_pong';
export type ItemKind = 'menu' | 'store';
export type Status = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export const RESOURCE_TYPES: ResourceType[] = ['ps5', 'ps4', 'billiards', 'ping_pong'];
export const MENU_CATEGORIES = ['drinks', 'cakes', 'food', 'other'] as const;
export const STORE_CATEGORIES = ['cues', 'consoles', 'devices', 'accessories', 'other'] as const;

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  avatar_url: string | null;
  language: Lang;
  role: Role;
  branch_id: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
  address_en: string;
  address_ar: string;
  hours_en: string;
  hours_ar: string;
  /** 'HH:MM:SS' Egypt time; closes_at < opens_at = closes after midnight; equal = 24h; null = not set */
  opens_at: string | null;
  closes_at: string | null;
  phone: string;
  map_url: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Resource {
  id: string;
  branch_id: string;
  type: ResourceType;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  capacity: number;
  price_per_hour: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Item {
  id: string;
  branch_id: string;
  kind: ItemKind;
  category: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price: number;
  stock: number | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
}

type PersonSummary = Pick<Profile, 'full_name' | 'email' | 'phone' | 'avatar_url'>;

export interface Booking {
  id: string;
  user_id: string;
  branch_id: string;
  resource_id: string;
  start_at: string;
  end_at: string;
  guests: number;
  notes: string;
  status: Status;
  staff_note: string;
  total_price: number;
  created_at: string;
  resource?: Pick<Resource, 'name_en' | 'name_ar' | 'type'> | null;
  branch?: Pick<Branch, 'name_en' | 'name_ar'> | null;
  customer?: PersonSummary | null;
}

export interface OrderItem {
  id: string;
  item_id: string | null;
  name_en: string;
  name_ar: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  branch_id: string;
  status: Status;
  notes: string;
  staff_note: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
  branch?: Pick<Branch, 'name_en' | 'name_ar'> | null;
  customer?: PersonSummary | null;
}

export interface Announcement {
  id: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  image_url: string | null;
  link_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface SiteSettings {
  id: number;
  about_en: string;
  about_ar: string;
  about_image_url: string | null;
  phone: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  address_en: string;
  address_ar: string;
  ticker_enabled: boolean;
  /** 1 = very slow … 5 = very fast */
  ticker_speed: number;
  /** seconds each home-page advertisement is shown */
  ad_interval: number;
}
