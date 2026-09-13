import { env } from 'cloudflare:workers';

export type Seller = { id: number; user_id: string; email: string; business_name: string; city: string; phone: string; specialty: string; featured_service: string; service_price: number; bio: string; availability_days: string };
export type Booking = { id: number; seller_id: number; customer_name: string; customer_email: string; customer_phone: string; service_name: string; appointment_date: string; appointment_time: string; notes: string; status: string; created_at: number; business_name?: string; city?: string };
export type SellerSearch = { q?: string; city?: string; specialty?: string; maxPrice?: number };

function database() { if (!env.DB) throw new Error('Database unavailable'); return env.DB }
const sellerColumns = 'id, user_id, email, business_name, city, phone, specialty, featured_service, service_price, bio, availability_days';

export async function listSellers(filters: SellerSearch = {}) {
  const clauses: string[] = [], values: (string | number)[] = [];
  if (filters.city) { clauses.push('city = ?'); values.push(filters.city); }
  if (filters.specialty) { clauses.push('specialty = ?'); values.push(filters.specialty); }
  if (filters.maxPrice) { clauses.push('service_price <= ?'); values.push(filters.maxPrice); }
  if (filters.q) { clauses.push('(business_name LIKE ? OR featured_service LIKE ? OR bio LIKE ?)'); const match = `%${filters.q}%`; values.push(match, match, match); }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const result = await database().prepare(`SELECT ${sellerColumns} FROM seller_profiles${where} ORDER BY updated_at DESC LIMIT 48`).bind(...values).all<Seller>();
  return result.results;
}

export async function listSellerCities() {
  const result = await database().prepare('SELECT DISTINCT city FROM seller_profiles ORDER BY city LIMIT 48').all<{ city: string }>();
  return result.results.map((row) => row.city);
}

export async function findSeller(id: number) {
  return database().prepare(`SELECT ${sellerColumns} FROM seller_profiles WHERE id = ? LIMIT 1`).bind(id).first<Seller>();
}

export async function findSellerByUser(userId: string) {
  return database().prepare(`SELECT ${sellerColumns} FROM seller_profiles WHERE user_id = ? LIMIT 1`).bind(userId).first<Seller>();
}

export async function listBookingsForSeller(sellerId: number) {
  const result = await database().prepare('SELECT id, seller_id, customer_name, customer_email, customer_phone, service_name, appointment_date, appointment_time, notes, status, created_at FROM booking_requests WHERE seller_id = ? ORDER BY appointment_date, appointment_time LIMIT 100').bind(sellerId).all<Booking>();
  return result.results;
}

export async function listBookingsForCustomer(userId: string) {
  const result = await database().prepare('SELECT b.id, b.seller_id, b.customer_name, b.customer_email, b.customer_phone, b.service_name, b.appointment_date, b.appointment_time, b.notes, b.status, b.created_at, s.business_name, s.city FROM booking_requests b JOIN seller_profiles s ON s.id = b.seller_id WHERE b.customer_user_id = ? ORDER BY b.appointment_date DESC, b.appointment_time DESC LIMIT 100').bind(userId).all<Booking>();
  return result.results;
}

export async function isSlotTaken(sellerId: number, date: string, time: string) {
  return database().prepare("SELECT id FROM booking_requests WHERE seller_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending', 'confirmed') LIMIT 1").bind(sellerId, date, time).first<{ id: number }>();
}

export function getDatabase() { return database() }
