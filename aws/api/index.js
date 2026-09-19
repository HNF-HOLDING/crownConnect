const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Pool } = require('pg');

let pool;
let schemaReady;
const s3 = new S3Client({});
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
async function readyDatabase() {
  const db = await database();
  schemaReady ||= db.query(`
    CREATE TABLE IF NOT EXISTS account_profiles (id BIGSERIAL PRIMARY KEY, cognito_sub UUID NOT NULL UNIQUE, email TEXT NOT NULL, primary_role TEXT NOT NULL CHECK (primary_role IN ('customer', 'seller')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS seller_profiles (id BIGSERIAL PRIMARY KEY, cognito_sub UUID NOT NULL UNIQUE REFERENCES account_profiles(cognito_sub) ON DELETE CASCADE, email TEXT NOT NULL, business_name TEXT NOT NULL, city TEXT NOT NULL, phone TEXT NOT NULL, specialty TEXT NOT NULL, featured_service TEXT NOT NULL, service_price INTEGER NOT NULL CHECK (service_price >= 0), bio TEXT NOT NULL, availability_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS seller_services (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, name TEXT NOT NULL, price INTEGER NOT NULL CHECK (price >= 0), duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0), description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS seller_media (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, object_key TEXT NOT NULL UNIQUE, media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')), content_type TEXT NOT NULL, file_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS booking_requests (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, customer_cognito_sub UUID NOT NULL REFERENCES account_profiles(cognito_sub) ON DELETE RESTRICT, customer_email TEXT NOT NULL, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL, service_name TEXT NOT NULL, appointment_date DATE NOT NULL, appointment_time TIME NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_seller_profiles_city_specialty ON seller_profiles(city, specialty);
    CREATE INDEX IF NOT EXISTS idx_seller_services_seller_created ON seller_services(seller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_media_seller_created ON seller_media(seller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_booking_seller_date ON booking_requests(seller_id, appointment_date);
    CREATE UNIQUE INDEX IF NOT EXISTS booking_active_slot ON booking_requests(seller_id, appointment_date, appointment_time) WHERE status IN ('pending', 'confirmed');
  `);
  await schemaReady;
  return db;
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
  const result = await (await readyDatabase()).query(`SELECT id, business_name, city, phone, specialty, featured_service, service_price, bio, availability_days FROM seller_profiles ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC LIMIT 48`, values);
  return json(200, { sellers: result.rows });
}

async function sellerDetails(id) {
  const db = await readyDatabase();
  const seller = await db.query('SELECT id, business_name, city, phone, specialty, featured_service, service_price, bio, availability_days FROM seller_profiles WHERE id = $1', [id]);
  if (!seller.rowCount) return error(404, 'Stylist not found');
  const services = await db.query('SELECT id, name, price, duration_minutes, description FROM seller_services WHERE seller_id = $1 ORDER BY created_at DESC', [id]);
  const media = await db.query('SELECT id, media_type, content_type, file_name, object_key FROM seller_media WHERE seller_id = $1 ORDER BY created_at DESC', [id]);
  const withUrls = await Promise.all(media.rows.map(async (item) => ({
    id: item.id,
    media_type: item.media_type,
    content_type: item.content_type,
    file_name: item.file_name,
    url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: item.object_key }), { expiresIn: 3600 }),
  })));
  return json(200, { seller: seller.rows[0], services: services.rows, media: withUrls });
}

async function availability(event) {
  const query = event.queryStringParameters || {}, sellerId = Number(query.sellerId), date = clean(query.date, 10);
  if (!Number.isInteger(sellerId) || !dateIsValid(date)) return error(400, 'Invalid request');
  const db = await readyDatabase();
  const seller = await db.query('SELECT availability_days FROM seller_profiles WHERE id = $1', [sellerId]);
  if (!seller.rowCount) return error(404, 'Stylist not found');
  const taken = await db.query("SELECT appointment_time::text FROM booking_requests WHERE seller_id = $1 AND appointment_date = $2 AND status IN ('pending', 'confirmed')", [sellerId, date]);
  return json(200, { available: seller.rows[0].availability_days.split(',').includes(weekday(date)), takenTimes: taken.rows.map((row) => row.appointment_time.slice(0, 5)) });
}

async function saveAccount(event) {
  const user = claims(event), data = await body(event), role = data && clean(data.role, 10);
  if (!user) return error(401, 'Sign in required');
  if (!['customer', 'seller'].includes(role)) return error(400, 'Choose Customer or Seller.');
  await (await readyDatabase()).query(`INSERT INTO account_profiles (cognito_sub, email, primary_role) VALUES ($1::uuid, $2, $3) ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email, primary_role = EXCLUDED.primary_role, updated_at = NOW()`, [user.sub, user.email, role]);
  return json(200, { ok: true, role });
}

async function createBooking(event) {
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');
  const sellerId = Number(data?.sellerId), serviceId = Number(data?.serviceId), customerName = clean(data?.customerName, 80), customerPhone = clean(data?.customerPhone, 30), appointmentDate = clean(data?.appointmentDate, 10), appointmentTime = clean(data?.appointmentTime, 5), notes = clean(data?.notes, 500);
  if (!Number.isInteger(sellerId) || !customerName || !customerPhone || !dateIsValid(appointmentDate) || appointmentDate < today() || !['09:00', '11:00', '13:00', '15:00'].includes(appointmentTime)) return error(400, 'Choose an available future date and time.');
  const db = await readyDatabase();
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
async function saveSeller(event) {
  const user = claims(event);
  const data = await body(event);

  if (!user) return error(401, 'Sign in required');

  const businessName = clean(data?.businessName, 120);
  const city = clean(data?.city, 80);
  const phone = clean(data?.phone, 30);
  const specialty = clean(data?.specialty, 80);
  const featuredService = clean(data?.featuredService, 100);
  const servicePrice = Number(data?.servicePrice);
  const bio = clean(data?.bio, 1000);
  const availabilityDays =
    clean(data?.availabilityDays, 100) || 'Mon,Tue,Wed,Thu,Fri,Sat';

  if (
    !businessName || !city || !phone || !specialty ||
    !featuredService || !bio ||
    !Number.isInteger(servicePrice) || servicePrice < 0
  ) {
    return error(400, 'Complete all seller profile fields.');
  }

  const db = await readyDatabase();

  await db.query(
    `INSERT INTO account_profiles (cognito_sub, email, primary_role)
     VALUES ($1::uuid, $2, 'seller')
     ON CONFLICT (cognito_sub)
     DO UPDATE SET email = EXCLUDED.email, primary_role = 'seller', updated_at = NOW()`,
    [user.sub, user.email],
  );

  const result = await db.query(
    `INSERT INTO seller_profiles
      (cognito_sub, email, business_name, city, phone, specialty,
       featured_service, service_price, bio, availability_days)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (cognito_sub)
     DO UPDATE SET
       email = EXCLUDED.email,
       business_name = EXCLUDED.business_name,
       city = EXCLUDED.city,
       phone = EXCLUDED.phone,
       specialty = EXCLUDED.specialty,
       featured_service = EXCLUDED.featured_service,
       service_price = EXCLUDED.service_price,
       bio = EXCLUDED.bio,
       availability_days = EXCLUDED.availability_days,
       updated_at = NOW()
     RETURNING id, business_name, city, specialty, featured_service, service_price`,
    [
      user.sub, user.email, businessName, city, phone, specialty,
      featuredService, servicePrice, bio, availabilityDays,
    ],
  );

  return json(200, { seller: result.rows[0] });
}

async function createService(event) {
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');

  const name = clean(data?.name, 100);
  const price = Number(data?.price);
  const durationMinutes = Number(data?.durationMinutes);
  const description = clean(data?.description, 500);

  if (!name || !Number.isInteger(price) || price < 0 || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return error(400, 'Provide a service name, a valid price, and duration in minutes.');
  }

  const db = await readyDatabase();
  const seller = await db.query('SELECT id FROM seller_profiles WHERE cognito_sub = $1::uuid', [user.sub]);
  if (!seller.rowCount) return error(400, 'Create your seller profile before adding services.');

  const result = await db.query(
    `INSERT INTO seller_services (seller_id, name, price, duration_minutes, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, price, duration_minutes, description`,
    [seller.rows[0].id, name, price, durationMinutes, description],
  );
  return json(201, { service: result.rows[0] });
}

const mediaFormats = {
  'image/jpeg': { type: 'image', extension: 'jpg' },
  'image/png': { type: 'image', extension: 'png' },
  'image/webp': { type: 'image', extension: 'webp' },
  'video/mp4': { type: 'video', extension: 'mp4' },
  'video/webm': { type: 'video', extension: 'webm' },
};

async function createMediaUpload(event) {
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');

  const contentType = clean(data?.contentType, 100);
  const fileName = clean(data?.fileName, 140);
  const format = mediaFormats[contentType];
  if (!format || !fileName) return error(400, 'Use a JPG, PNG, WebP, MP4, or WebM file.');

  const db = await readyDatabase();
  const seller = await db.query('SELECT id FROM seller_profiles WHERE cognito_sub = $1::uuid', [user.sub]);
  if (!seller.rowCount) return error(400, 'Create your seller profile before uploading media.');

  const objectKey = `seller-media/${seller.rows[0].id}/${crypto.randomUUID()}.${format.extension}`;
  const result = await db.query(
    `INSERT INTO seller_media (seller_id, object_key, media_type, content_type, file_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, media_type, content_type, file_name`,
    [seller.rows[0].id, objectKey, format.type, contentType, fileName],
  );
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.MEDIA_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  }), { expiresIn: 900 });
  return json(201, { media: result.rows[0], uploadUrl, expiresIn: 900 });
}

async function listSellerBookings(event) {
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');

  const db = await readyDatabase();
  const seller = await db.query('SELECT id FROM seller_profiles WHERE cognito_sub = $1::uuid', [user.sub]);
  if (!seller.rowCount) return error(400, 'Create your seller profile first.');

  const result = await db.query(
    `SELECT id, customer_email, customer_name, customer_phone, service_name,
            appointment_date, appointment_time::text AS appointment_time, notes,
            status, created_at
     FROM booking_requests
     WHERE seller_id = $1
     ORDER BY appointment_date ASC, appointment_time ASC, created_at DESC`,
    [seller.rows[0].id],
  );
  return json(200, { bookings: result.rows.map((booking) => ({
    ...booking,
    appointment_time: booking.appointment_time.slice(0, 5),
  })) });
}

async function ownSeller(event) {
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const db = await readyDatabase();
  const seller = await db.query(
    `SELECT id, business_name, city, phone, specialty, featured_service,
            service_price, bio, availability_days
     FROM seller_profiles WHERE cognito_sub = $1::uuid`,
    [user.sub],
  );
  if (!seller.rowCount) return json(200, { seller: null, services: [], media: [], bookings: [] });
  const sellerId = seller.rows[0].id;
  const [services, media, bookings] = await Promise.all([
    db.query('SELECT id, name, price, duration_minutes, description FROM seller_services WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]),
    db.query('SELECT id, media_type, content_type, file_name, object_key FROM seller_media WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]),
    db.query(`SELECT id, customer_email, customer_name, customer_phone, service_name,
                     appointment_date, appointment_time::text AS appointment_time, notes,
                     status, created_at
              FROM booking_requests WHERE seller_id = $1
              ORDER BY appointment_date ASC, appointment_time ASC, created_at DESC`, [sellerId]),
  ]);
  const mediaWithUrls = await Promise.all(media.rows.map(async (item) => ({
    id: item.id,
    media_type: item.media_type,
    content_type: item.content_type,
    file_name: item.file_name,
    url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: item.object_key }), { expiresIn: 3600 }),
  })));
  return json(200, {
    seller: seller.rows[0],
    services: services.rows,
    media: mediaWithUrls,
    bookings: bookings.rows.map((booking) => ({ ...booking, appointment_time: booking.appointment_time.slice(0, 5) })),
  });
}

async function listCustomerBookings(event) {
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const result = await (await readyDatabase()).query(
    `SELECT b.id, b.service_name, b.appointment_date,
            b.appointment_time::text AS appointment_time, b.notes, b.status, b.created_at,
            s.business_name, s.city, s.phone AS seller_phone
     FROM booking_requests b
     JOIN seller_profiles s ON s.id = b.seller_id
     WHERE b.customer_cognito_sub = $1::uuid
     ORDER BY b.appointment_date DESC, b.appointment_time DESC`,
    [user.sub],
  );
  return json(200, { bookings: result.rows.map((booking) => ({ ...booking, appointment_time: booking.appointment_time.slice(0, 5) })) });
}

async function cancelCustomerBooking(event) {
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const bookingId = Number(event.pathParameters?.id);
  if (!Number.isInteger(bookingId)) return error(400, 'Invalid booking.');
  const result = await (await readyDatabase()).query(
    `UPDATE booking_requests SET status = 'cancelled'
     WHERE id = $1 AND customer_cognito_sub = $2::uuid AND status IN ('pending', 'confirmed')
     RETURNING id, status`,
    [bookingId, user.sub],
  );
  if (!result.rowCount) return error(404, 'Booking was not found or cannot be cancelled.');
  return json(200, { booking: result.rows[0] });
}

async function deleteMedia(event) {
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const mediaId = Number(event.pathParameters?.id);
  if (!Number.isInteger(mediaId)) return error(400, 'Invalid media item.');
  const db = await readyDatabase();
  const result = await db.query(
    `DELETE FROM seller_media m
     USING seller_profiles s
     WHERE m.id = $1 AND m.seller_id = s.id AND s.cognito_sub = $2::uuid
     RETURNING m.object_key`,
    [mediaId, user.sub],
  );
  if (!result.rowCount) return error(404, 'Media item not found.');
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: result.rows[0].object_key }));
  return json(200, { ok: true });
}

async function updateBookingStatus(event) {
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');

  const bookingId = Number(event.pathParameters?.id);
  const status = clean(data?.status, 12);
  if (!Number.isInteger(bookingId) || !['confirmed', 'declined', 'cancelled'].includes(status)) {
    return error(400, 'Choose confirmed, declined, or cancelled.');
  }

  const db = await readyDatabase();
  const seller = await db.query('SELECT id FROM seller_profiles WHERE cognito_sub = $1::uuid', [user.sub]);
  if (!seller.rowCount) return error(403, 'Only the seller can update this booking.');

  const result = await db.query(
    `UPDATE booking_requests
     SET status = $1
     WHERE id = $2 AND seller_id = $3
     RETURNING id, status, appointment_date, appointment_time::text AS appointment_time`,
    [status, bookingId, seller.rows[0].id],
  );
  if (!result.rowCount) return error(404, 'Booking not found.');
  return json(200, { booking: { ...result.rows[0], appointment_time: result.rows[0].appointment_time.slice(0, 5) } });
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
    if (method === 'POST' && path === '/seller') return saveSeller(event);
    if (method === 'GET' && path === '/seller') return ownSeller(event);
    if (method === 'POST' && path === '/services') return createService(event);
    if (method === 'POST' && path === '/media/upload-url') return createMediaUpload(event);
    if (method === 'DELETE' && /^\/media\/\d+$/.test(path)) return deleteMedia(event);
    if (method === 'GET' && path === '/seller/bookings') return listSellerBookings(event);
    if (method === 'GET' && path === '/bookings') return listCustomerBookings(event);
    if (method === 'PATCH' && /^\/bookings\/\d+\/cancel$/.test(path)) return cancelCustomerBooking(event);
    if (method === 'PATCH' && /^\/bookings\/\d+\/status$/.test(path)) return updateBookingStatus(event);
    return error(404, 'Not found');
  } catch (cause) {
    console.error(cause);
    return error(500, 'Unable to complete that request.');
  }
};
