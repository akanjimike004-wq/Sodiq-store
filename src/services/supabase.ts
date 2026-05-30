import { createClient } from '@supabase/supabase-js';

// Retrieve direct environment variables with fallback to user's provided project details.
const meta = import.meta as any;
const supabaseUrl = meta.env?.VITE_SUPABASE_URL || 'https://biztvougwbgbqmwttezh.supabase.co';
const supabaseKey = meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_r3UJMug_pTz_l1T7tSgUJA_gjfLWmRP';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaces for our Luxury Fashion Store
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  imageUrl: string;
  createdAt?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  whatsappLink: string;
  createdAt: any;
}

export interface Return {
  id: string;
  orderId: string;
  items: any[];
  reason: string;
  status: 'pending' | 'received' | 'inspected' | 'completed';
  createdAt: any;
}

// Data Mapping helpers supporting both snake_case and camelCase DB columns
export function mapProduct(p: any): Product {
  return {
    id: String(p.id),
    name: p.name || '',
    description: p.description || '',
    price: Number(p.price || 0),
    category: p.category || '',
    stock: Number(p.stock || 0),
    sku: p.sku || '',
    imageUrl: p.imageUrl || p.image_url || 'https://images.unsplash.com/photo-1594932224010-74f43a183546?auto=format&fit=crop&q=80&w=400',
    createdAt: p.createdAt || p.created_at
  };
}

export function mapOrder(o: any): Order {
  return {
    id: String(o.id),
    customerName: o.customerName || o.customer_name || 'Guest Customer',
    customerPhone: o.customerPhone || o.customer_phone || '',
    items: typeof o.items === 'string' ? JSON.parse(o.items) : (Array.isArray(o.items) ? o.items : []),
    total: Number(o.total || 0),
    status: o.status || 'pending',
    whatsappLink: o.whatsappLink || o.whatsapp_link || '',
    createdAt: o.createdAt || o.created_at
  };
}

export function mapReturn(r: any): Return {
  return {
    id: String(r.id),
    orderId: r.orderId || r.order_id || '',
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (Array.isArray(r.items) ? r.items : []),
    reason: r.reason || '',
    status: r.status || 'pending',
    createdAt: r.createdAt || r.created_at
  };
}
