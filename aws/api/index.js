const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Pool } = require('pg');

let pool;
const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' },
  body: JSON.stringify(body),
});
const error = (statusCode, message) => json(statusCode, { error: message });

async function database() {
  if (pool) return pool;
  const secret = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: process.env.DATABASE_SECRET_ARN }));
  const credentials = JSON.parse(secret.SecretString || '{}');
  pool = new Pool({ host: process.env.DATABASE_HOST, database: process.env.DATABASE_NAME, user: credentials.username, password: credentials.password, port: 5432, ssl: { rejectUnauthorized: false }, max: 4 });
  return pool;
}

function claims(event) {
  const jwt = event.requestContext?.authorizer?.jwt?.claims;
  return jwt?.sub && jwt?.email ? { sub: jwt.sub, email: jwt.email } : null;
}
function clean(value, max) { return String(value || '').trim().slice(0, max); }
function dateIsValid(value) { const date = new Date(`${value}T12:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }
function weekday(value) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${value}T12:00:00Z`).getUTCDay()]; }
function today() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (name) => parts.find((part) => part.type === name)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
async function body(event) { try { return JSON.parse(event.body || '{}'); } catch { return null; } }

async function listSellers(event) {
  const query = event.queryStringParameters || {}, values = [], where = [];
  if (query.city) { values.push(clean(query.city, 80)); where.push(`city = $${values.length}`); }
  if (query.specialty) { values.push(clean(query.specialty, 40)); where.push(`specialty = $${values.length}`); }
  if (query.maxPrice && Number.isFinite(Number(query.maxPrice))) { values.push(Number(query.maxPrice)); where.push(`service_price <= $${values.length}`); }
  if (query.q) { values.push(`%${clean(query.q, 100)}%`); where.push(`(business_name ILIKE $${values.length} OR featured_service ILIKE $${values.length} OR bio ILIKE $${values.length})`); }
  const result = await (await database()).query(`SELECT id, business_name, city, phone, specialty, featured_service, service_price, bio, availability_days FROM seller_profiles ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC LIMIT 48`, values);
  return json(200, { sellers: result.rows });
}

async function sellerDetails(id) {
  const db = await database();
  const seller = await db.query('SELECT id, business_name, city, phone, specialty, featured_service, service_price, bio, availability_days FROM seller_profiles WHERE id = $1', [id]);
  if (!seller.rowCount) return error(404, 'Stylist not found');
  const services = await db.query('SELECT id, name, price, duration_minutes, description FROM seller_services WHERE seller_id = $1 ORDER BY created_at DESC', [id]);
  return json(200, { seller: seller.rows[0], services: services.rows });
}

async function availability(event) {
  const query = event.queryStringParameters || {}, sellerId = Number(query.sellerId), date = clean(query.date, 10);
  if (!Number.isInteger(sellerId) || !dateIsValid(date)) return error(400, 'Invalid request');
  const db = await database();
  const seller = await db.query('SELECT availability_days FROM seller_profiles WHERE id = $1', [sellerId]);
  if (!seller.rowCount) return error(404, 'Stylist not found');
  const taken = await db.query("SELECT appointment_time::text FROM booking_requests WHERE seller_id = $1 AND appointment_date = $2 AND status IN ('pending', 'confirmed')", [sellerId, date]);
  return json(200, { available: seller.rows[0].availability_days.split(',').includes(weekday(date)), takenTimes: taken.rows.map((row) => row.appointment_time.slice(0, 5)) });
}

async function saveAccount(event) {
  const user = claims(event), data = await body(event), role = data && clean(data.role, 10);
  if (!user) return error(401, 'Sign in required');
  if (!['customer', 'seller'].includes(role)) return error(400, 'Choose Customer or Seller.');
  await (await database()).query(`INSERT INTO account_profiles (cognito_sub, email, primary_role) VALUES ($1::uuid, $2, $3) ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email, primary_role = EXCLUDED.primary_role, updated_at = NOW()`, [user.sub, user.email, role]);
  return json(200, { ok: true, role });
}

async function createBooking(event) {
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');
  const sellerId = Number(data?.sellerId), serviceId = Number(data?.serviceId), customerName = clean(data?.customerName, 80), customerPhone = clean(data?.customerPhone, 30), appointmentDate = clean(data?.appointmentDate, 10), appointmentTime = clean(data?.appointmentTime, 5), notes = clean(data?.notes, 500);
  if (!Number.isInteger(sellerId) || !customerName || !customerPhone || !dateIsValid(appointmentDate) || appointmentDate < today() || !['09:00', '11:00', '13:00', '15:00'].includes(appointmentTime)) return error(400, 'Choose an available future date and time.');
  const db = await database();
  const seller = await db.query('SELECT id, cognito_sub, featured_service, availability_days FROM seller_profiles WHERE id = $1', [sellerId]);
  if (!seller.rowCount || seller.rows[0].cognito_sub === user.sub || !seller.rows[0].availability_days.split(',').includes(weekday(appointmentDate))) return error(400, 'Choose an available future date and time.');
  const service = Number.isInteger(serviceId) && serviceId > 0 ? await db.query('SELECT name FROM seller_services WHERE id = $1 AND seller_id = $2', [serviceId, sellerId]) : null;
  try {
    await db.query(`INSERT INTO booking_requests (seller_id, customer_cognito_sub, customer_email, customer_name, customer_phone, service_name, appointment_date, appointment_time, notes) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::date, $8::time, $9)`, [sellerId, user.sub, user.email, customerName, customerPhone, service?.rows[0]?.name || seller.rows[0].featured_service, appointmentDate, appointmentTime, notes]);
  } catch (cause) {
    if (cause?.code === '23505') return error(409, 'That time has just been requested. Please choose another slot.');
    throw cause;
  }
  return json(201, { ok: true });
}

exports.handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === 'OPTIONS') return json(204, {});
    const method = event.requestContext?.http?.method, path = event.rawPath;
    if (method === 'GET' && path === '/health') return json(200, { status: 'ok', service: 'crownconnect-api', environment: process.env.APP_ENV });
    if (method === 'GET' && path === '/sellers') return listSellers(event);
    if (method === 'GET' && /^\/sellers\/\d+$/.test(path)) return sellerDetails(Number(path.split('/').pop()));
    if (method === 'GET' && path === '/availability') return availability(event);
    if (method === 'POST' && path === '/account') return saveAccount(event);
    if (method === 'POST' && path === '/bookings') return createBooking(event);
    return error(404, 'Not found');
  } catch (cause) {
    console.error(cause);
    return error(500, 'Unable to complete that request.');
  }
};
