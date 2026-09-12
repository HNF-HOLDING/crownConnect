import { env } from 'cloudflare:workers';

export type Seller = { id: number; user_id: string; email: string; business_name: string; city: string; phone: string; specialty: string; featured_service: string; service_price: number; bio: string };
export type Booking = { id: number; customer_name: string; customer_email: string; customer_phone: string; service_name: string; appointment_date: string; appointment_time: string; notes: string; status: string; created_at: number };

function database() { if (!env.DB) throw new Error('Database unavailable'); return env.DB }

export async function listSellers() {
  const result = await database().prepare('SELECT id, user_id, email, business_name, city, phone, specialty, featured_service, service_price, bio FROM seller_profiles ORDER BY updated_at DESC LIMIT 24').all<Seller>();
  return result.results;
}

export async function findSeller(id: number) {
  return database().prepare('SELECT id, user_id, email, business_name, city, phone, specialty, featured_service, service_price, bio FROM seller_profiles WHERE id = ? LIMIT 1').bind(id).first<Seller>();
}

export async function findSellerByUser(userId: string) {
  return database().prepare('SELECT id, user_id, email, business_name, city, phone, specialty, featured_service, service_price, bio FROM seller_profiles WHERE user_id = ? LIMIT 1').bind(userId).first<Seller>();
}

export async function listBookingsForSeller(sellerId: number) {
  const result = await database().prepare('SELECT id, customer_name, customer_email, customer_phone, service_name, appointment_date, appointment_time, notes, status, created_at FROM booking_requests WHERE seller_id = ? ORDER BY appointment_date, appointment_time LIMIT 100').bind(sellerId).all<Booking>();
  return result.results;
}

export function getDatabase() { return database() }
