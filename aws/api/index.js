const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Pool } = require('pg');

let pool;
let schemaReady;
const s3 = new S3Client({});
const json = (statusCode, body, origin) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin === process.env.FRONTEND_ORIGIN ? origin : process.env.FRONTEND_ORIGIN, 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' },
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
    CREATE TABLE IF NOT EXISTS account_profiles (id BIGSERIAL PRIMARY KEY, cognito_sub UUID NOT NULL UNIQUE, email TEXT NOT NULL, primary_role TEXT NOT NULL CHECK (primary_role IN ('customer', 'seller')), full_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', province TEXT NOT NULL DEFAULT '', marketing_consent BOOLEAN NOT NULL DEFAULT FALSE, terms_accepted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
    ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS province TEXT NOT NULL DEFAULT '';
    ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS professional_applications (id BIGSERIAL PRIMARY KEY, cognito_sub UUID NOT NULL UNIQUE, email TEXT NOT NULL, legal_name TEXT NOT NULL, business_name TEXT NOT NULL, phone TEXT NOT NULL, city TEXT NOT NULL, province TEXT NOT NULL, service_area TEXT NOT NULL, categories TEXT NOT NULL, years_experience INTEGER NOT NULL CHECK (years_experience >= 0), bio TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'more_information', 'approved', 'rejected')), review_note TEXT NOT NULL DEFAULT '', submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ, reviewed_by TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS admin_audit_events (id BIGSERIAL PRIMARY KEY, admin_sub UUID NOT NULL, admin_email TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS seller_profiles (id BIGSERIAL PRIMARY KEY, cognito_sub UUID NOT NULL UNIQUE REFERENCES account_profiles(cognito_sub) ON DELETE CASCADE, email TEXT NOT NULL, business_name TEXT NOT NULL, city TEXT NOT NULL, phone TEXT NOT NULL, specialty TEXT NOT NULL, featured_service TEXT NOT NULL, service_price INTEGER NOT NULL CHECK (service_price >= 0), bio TEXT NOT NULL, availability_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS street_address TEXT NOT NULL DEFAULT '';
    ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg';
    ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS slot_interval_minutes INTEGER NOT NULL DEFAULT 30;
    CREATE TABLE IF NOT EXISTS seller_services (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, name TEXT NOT NULL, price INTEGER NOT NULL CHECK (price >= 0), duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0), description TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS seller_schedule (seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), start_time TIME NOT NULL, end_time TIME NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, PRIMARY KEY (seller_id, weekday), CHECK (end_time > start_time));
    CREATE TABLE IF NOT EXISTS seller_blocked_dates (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, blocked_date DATE NOT NULL, reason TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (seller_id, blocked_date));
    CREATE TABLE IF NOT EXISTS seller_media (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, object_key TEXT NOT NULL UNIQUE, media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')), content_type TEXT NOT NULL, file_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS booking_requests (id BIGSERIAL PRIMARY KEY, seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE, customer_cognito_sub UUID NOT NULL REFERENCES account_profiles(cognito_sub) ON DELETE RESTRICT, customer_email TEXT NOT NULL, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL, service_name TEXT NOT NULL, appointment_date DATE NOT NULL, appointment_time TIME NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 120;
    CREATE INDEX IF NOT EXISTS idx_seller_profiles_city_specialty ON seller_profiles(city, specialty);
    CREATE INDEX IF NOT EXISTS idx_seller_services_seller_created ON seller_services(seller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_seller_media_seller_created ON seller_media(seller_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_booking_seller_date ON booking_requests(seller_id, appointment_date);
    CREATE INDEX IF NOT EXISTS idx_blocked_dates_seller_date ON seller_blocked_dates(seller_id, blocked_date);
    CREATE UNIQUE INDEX IF NOT EXISTS booking_active_slot ON booking_requests(seller_id, appointment_date, appointment_time) WHERE status IN ('pending', 'confirmed');
    CREATE INDEX IF NOT EXISTS idx_professional_applications_status ON professional_applications(status, submitted_at DESC);
    CREATE TABLE IF NOT EXISTS products (sku TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL CHECK (price_cents >= 0), stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS customer_orders (id BIGSERIAL PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, customer_cognito_sub UUID NOT NULL REFERENCES account_profiles(cognito_sub) ON DELETE RESTRICT, customer_email TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT NOT NULL, street_address TEXT NOT NULL, city TEXT NOT NULL, province TEXT NOT NULL, subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0), delivery_cents INTEGER NOT NULL CHECK (delivery_cents >= 0), total_cents INTEGER NOT NULL CHECK (total_cents >= 0), status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')), payment_reference TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS ozow_payment_id TEXT;
    ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_orders_payment_reference ON customer_orders(payment_reference) WHERE payment_reference IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_orders_ozow_payment_id ON customer_orders(ozow_payment_id) WHERE ozow_payment_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS customer_order_items (id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE, product_sku TEXT NOT NULL REFERENCES products(sku) ON DELETE RESTRICT, product_name TEXT NOT NULL, unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0), quantity INTEGER NOT NULL CHECK (quantity > 0), line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0));
    CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_created ON customer_orders(customer_cognito_sub, created_at DESC);
    INSERT INTO products (sku, name, category, description, price_cents, stock_quantity) VALUES
      ('xpression-braid', 'X-Pression Ultra Braid 1B', 'Braids', 'Pre-stretched professional braiding hair.', 8999, 100),
      ('curl-ritual', 'Crown Curl Ritual Set', 'Hair care', 'A salon-quality cleansing and curl care set.', 42900, 40),
      ('body-wave', 'Brazilian Body Wave Bundles', 'Bundles', 'Soft body-wave bundles for versatile installs.', 129900, 20),
      ('edge-set', 'Silk Edge & Shine Set', 'Styling', 'Hold and shine essentials for a polished finish.', 24900, 50)
    ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, description = EXCLUDED.description, price_cents = EXCLUDED.price_cents, active = TRUE, updated_at = NOW();
    INSERT INTO professional_applications (cognito_sub, email, legal_name, business_name, phone, city, province, service_area, categories, years_experience, bio, status, reviewed_at, reviewed_by)
      SELECT s.cognito_sub, s.email, COALESCE(NULLIF(a.full_name, ''), s.business_name), s.business_name, s.phone, s.city, COALESCE(NULLIF(a.province, ''), 'Not provided'), s.city, s.specialty, 0, s.bio, 'approved', NOW(), 'legacy-migration'
      FROM seller_profiles s JOIN account_profiles a ON a.cognito_sub = s.cognito_sub
      ON CONFLICT (cognito_sub) DO NOTHING;
  `);
  await schemaReady;
  return db;
}

function claims(event) {
  const jwt = event.requestContext?.authorizer?.jwt?.claims;
  const groups = Array.isArray(jwt?.['cognito:groups']) ? jwt['cognito:groups'] : String(jwt?.['cognito:groups'] || '').split(',').map((group) => group.trim()).filter(Boolean);
  return jwt?.sub && jwt?.email ? { sub: jwt.sub, email: jwt.email, name: clean(jwt.name, 100), groups } : null;
}
function isAdmin(user) { return user?.groups?.includes('admin') || user?.groups?.includes('super_admin'); }
function clean(value, max) { return String(value || '').trim().slice(0, max); }
function dateIsValid(value) { const date = new Date(`${value}T12:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }
function weekday(value) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${value}T12:00:00Z`).getUTCDay()]; }
function today() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (name) => parts.find((part) => part.type === name)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
const weekdayNumber = (value) => new Date(`${value}T12:00:00Z`).getUTCDay();
function timeToMinutes(value) { const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number); return hours * 60 + minutes; }
function minutesToTime(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }
function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '')); }
async function body(event) { try { return JSON.parse(event.body || '{}'); } catch { return null; } }

async function listSellers(event) {
  const origin = arguments[1];
  const query = event.queryStringParameters || {}, values = [], where = [];
  if (query.city) { values.push(clean(query.city, 80)); where.push(`city = $${values.length}`); }
  if (query.specialty) { values.push(clean(query.specialty, 40)); where.push(`specialty = $${values.length}`); }
  if (query.maxPrice && Number.isFinite(Number(query.maxPrice))) { values.push(Number(query.maxPrice)); where.push(`service_price <= $${values.length}`); }
  if (query.q) { values.push(`%${clean(query.q, 100)}%`); where.push(`(business_name ILIKE $${values.length} OR featured_service ILIKE $${values.length} OR bio ILIKE $${values.length})`); }
  const result = await (await readyDatabase()).query(`SELECT id, business_name, city, specialty, featured_service, service_price, bio, availability_days, latitude, longitude FROM seller_profiles ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC LIMIT 48`, values);
  // Do not expose seller phone numbers on public list
  const sellers = result.rows.map(r => ({ id: r.id, business_name: r.business_name, city: r.city, specialty: r.specialty, featured_service: r.featured_service, service_price: r.service_price, bio: r.bio, availability_days: r.availability_days, latitude: r.latitude, longitude: r.longitude }));
  return json(200, { sellers });
}

async function sellerDetails(id) {
  const origin = arguments[1];
  const db = await readyDatabase();
  const seller = await db.query('SELECT id, business_name, city, specialty, featured_service, service_price, bio, availability_days, street_address, latitude, longitude, slot_interval_minutes FROM seller_profiles WHERE id = $1', [id]);
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
  // Public detail endpoint: do not return seller phone. Booking will route through POST /bookings which notifies the seller.
  const publicSeller = { id: seller.rows[0].id, business_name: seller.rows[0].business_name, city: seller.rows[0].city, specialty: seller.rows[0].specialty, featured_service: seller.rows[0].featured_service, service_price: seller.rows[0].service_price, bio: seller.rows[0].bio, availability_days: seller.rows[0].availability_days, street_address: seller.rows[0].street_address, latitude: seller.rows[0].latitude, longitude: seller.rows[0].longitude, slot_interval_minutes: seller.rows[0].slot_interval_minutes };
  return json(200, { seller: publicSeller, services: services.rows, media: withUrls });
}

async function availableSlots(db, sellerId, date, serviceId) {
  const seller = await db.query('SELECT availability_days, slot_interval_minutes FROM seller_profiles WHERE id = $1', [sellerId]);
  if (!seller.rowCount) return null;
  const blocked = await db.query('SELECT reason FROM seller_blocked_dates WHERE seller_id = $1 AND blocked_date = $2::date', [sellerId, date]);
  if (blocked.rowCount) return { available: false, slots: [], reason: blocked.rows[0].reason || 'Stylist unavailable' };
  const schedule = await db.query('SELECT start_time::text, end_time::text FROM seller_schedule WHERE seller_id = $1 AND weekday = $2 AND active = TRUE', [sellerId, weekdayNumber(date)]);
  let start = 9 * 60, end = 17 * 60;
  if (schedule.rowCount) {
    start = timeToMinutes(schedule.rows[0].start_time);
    end = timeToMinutes(schedule.rows[0].end_time);
  } else if (!seller.rows[0].availability_days.split(',').includes(weekday(date))) {
    return { available: false, slots: [], reason: 'Stylist does not work on this day' };
  }
  let duration = 120;
  if (Number.isInteger(serviceId) && serviceId > 0) {
    const service = await db.query('SELECT duration_minutes FROM seller_services WHERE id = $1 AND seller_id = $2', [serviceId, sellerId]);
    if (service.rowCount) duration = service.rows[0].duration_minutes;
  }
  const bookings = await db.query("SELECT appointment_time::text, duration_minutes FROM booking_requests WHERE seller_id = $1 AND appointment_date = $2::date AND status IN ('pending', 'confirmed')", [sellerId, date]);
  const interval = Math.max(15, Math.min(120, Number(seller.rows[0].slot_interval_minutes) || 30));
  const slots = [];
  for (let candidate = start; candidate + duration <= end; candidate += interval) {
    const overlaps = bookings.rows.some((booking) => {
      const bookedStart = timeToMinutes(booking.appointment_time), bookedEnd = bookedStart + Number(booking.duration_minutes || 120);
      return candidate < bookedEnd && candidate + duration > bookedStart;
    });
    if (!overlaps) slots.push(minutesToTime(candidate));
  }
  return { available: true, slots, durationMinutes: duration, startTime: minutesToTime(start), endTime: minutesToTime(end) };
}

async function availability(event) {
  const origin = arguments[1];
  const query = event.queryStringParameters || {}, sellerId = Number(query.sellerId), serviceId = Number(query.serviceId), date = clean(query.date, 10);
  if (!Number.isInteger(sellerId) || !dateIsValid(date) || date < today()) return error(400, 'Invalid request');
  const result = await availableSlots(await readyDatabase(), sellerId, date, serviceId);
  if (!result) return error(404, 'Stylist not found');
  return json(200, result, origin);
}

async function saveAccount(event) {
  const origin = arguments[1];
  const user = claims(event), data = await body(event), role = data && clean(data.role, 10);
  if (!user) return error(401, 'Sign in required');
  if (!['customer', 'seller'].includes(role)) return error(400, 'Choose Customer or Seller.');
  const fullName = clean(data?.fullName || user.name, 100), phone = clean(data?.phone, 30);
  const city = clean(data?.city, 80), province = clean(data?.province, 40);
  const marketingConsent = data?.marketingConsent === true;
  if (!fullName || !phone || !city || !province) return error(400, 'Complete your name, phone, city, and province.');
  if (data?.termsAccepted !== true) return error(400, 'Accept the Terms and Privacy Notice to continue.');
  const db = await readyDatabase();
  if (role === 'seller' && !(await requireApprovedProfessional(user, db))) return error(403, 'Apply through CrownConnect Pro and wait for approval before selecting the professional role.');
  const result = await db.query(
    `INSERT INTO account_profiles (cognito_sub, email, primary_role, full_name, phone, city, province, marketing_consent, terms_accepted_at)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email, primary_role = EXCLUDED.primary_role,
       full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, city = EXCLUDED.city,
       province = EXCLUDED.province, marketing_consent = EXCLUDED.marketing_consent,
       terms_accepted_at = COALESCE(account_profiles.terms_accepted_at, NOW()), updated_at = NOW()
     RETURNING email, primary_role, full_name, phone, city, province, marketing_consent`,
    [user.sub, user.email, role, fullName, phone, city, province, marketingConsent],
  );
  return json(200, { account: result.rows[0] });
}

async function getAccount(event) {
  const origin = arguments[1];
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const result = await (await readyDatabase()).query(
    `SELECT email, primary_role, full_name, phone, city, province, marketing_consent,
            terms_accepted_at IS NOT NULL AS terms_accepted
     FROM account_profiles WHERE cognito_sub = $1::uuid`,
    [user.sub],
  );
  return json(200, { account: result.rows[0] || null, identity: { email: user.email, name: user.name } });
}

async function saveProfessionalApplication(event) {
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');
  const legalName = clean(data?.legalName || user.name, 100), businessName = clean(data?.businessName, 120);
  const phone = clean(data?.phone, 30), city = clean(data?.city, 80), province = clean(data?.province, 40);
  const serviceArea = clean(data?.serviceArea, 120), categories = clean(data?.categories, 300), bio = clean(data?.bio, 1000);
  const yearsExperience = Number(data?.yearsExperience);
  if (!legalName || !businessName || !phone || !city || !province || !serviceArea || !categories || !bio || !Number.isInteger(yearsExperience) || yearsExperience < 0 || data?.providerAgreement !== true) return error(400, 'Complete every required application field and accept the provider agreement.');
  const db = await readyDatabase();
  const existing = await db.query('SELECT status FROM professional_applications WHERE cognito_sub = $1::uuid', [user.sub]);
  if (existing.rows[0]?.status === 'approved') return error(409, 'This professional account is already approved.');
  await db.query(`INSERT INTO account_profiles (cognito_sub, email, primary_role, full_name, phone, city, province, terms_accepted_at)
    VALUES ($1::uuid, $2, 'customer', $3, $4, $5, $6, NOW())
    ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, city = EXCLUDED.city, province = EXCLUDED.province, terms_accepted_at = COALESCE(account_profiles.terms_accepted_at, NOW()), updated_at = NOW()`, [user.sub, user.email, legalName, phone, city, province]);
  const result = await db.query(`INSERT INTO professional_applications (cognito_sub, email, legal_name, business_name, phone, city, province, service_area, categories, years_experience, bio, status, review_note, submitted_at, updated_at)
    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'submitted', '', NOW(), NOW())
    ON CONFLICT (cognito_sub) DO UPDATE SET email = EXCLUDED.email, legal_name = EXCLUDED.legal_name, business_name = EXCLUDED.business_name, phone = EXCLUDED.phone, city = EXCLUDED.city, province = EXCLUDED.province, service_area = EXCLUDED.service_area, categories = EXCLUDED.categories, years_experience = EXCLUDED.years_experience, bio = EXCLUDED.bio, status = 'submitted', review_note = '', submitted_at = NOW(), reviewed_at = NULL, reviewed_by = NULL, updated_at = NOW()
    RETURNING id, business_name, status, submitted_at`, [user.sub, user.email, legalName, businessName, phone, city, province, serviceArea, categories, yearsExperience, bio]);
  return json(201, { application: result.rows[0] });
}

async function getProfessionalApplication(event) {
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const result = await (await readyDatabase()).query(`SELECT id, email, legal_name, business_name, phone, city, province, service_area, categories, years_experience, bio, status, review_note, submitted_at, reviewed_at FROM professional_applications WHERE cognito_sub = $1::uuid`, [user.sub]);
  return json(200, { application: result.rows[0] || null });
}

async function listProfessionalApplications(event) {
  const user = claims(event);
  if (!isAdmin(user)) return error(403, 'Administrator permission required.');
  const result = await (await readyDatabase()).query(`SELECT id, email, legal_name, business_name, phone, city, province, service_area, categories, years_experience, bio, status, review_note, submitted_at, reviewed_at, reviewed_by FROM professional_applications ORDER BY CASE status WHEN 'submitted' THEN 0 WHEN 'under_review' THEN 1 WHEN 'more_information' THEN 2 ELSE 3 END, submitted_at DESC LIMIT 200`);
  return json(200, { applications: result.rows });
}

async function reviewProfessionalApplication(event) {
  const user = claims(event), data = await body(event), applicationId = Number(event.pathParameters?.id);
  if (!isAdmin(user)) return error(403, 'Administrator permission required.');
  const status = clean(data?.status, 30), reviewNote = clean(data?.reviewNote, 1000);
  if (!Number.isInteger(applicationId) || !['under_review', 'more_information', 'approved', 'rejected'].includes(status)) return error(400, 'Choose a valid review decision.');
  if (['more_information', 'rejected'].includes(status) && !reviewNote) return error(400, 'Add a review note for this decision.');
  const db = await readyDatabase();
  const result = await db.query(`UPDATE professional_applications SET status = $1, review_note = $2, reviewed_at = NOW(), reviewed_by = $3, updated_at = NOW() WHERE id = $4 RETURNING id, cognito_sub, email, business_name, status, review_note`, [status, reviewNote, user.email, applicationId]);
  if (!result.rowCount) return error(404, 'Application not found.');
  if (status === 'approved') await db.query(`UPDATE account_profiles SET primary_role = 'seller', updated_at = NOW() WHERE cognito_sub = $1::uuid`, [result.rows[0].cognito_sub]);
  await db.query(`INSERT INTO admin_audit_events (admin_sub, admin_email, action, target_type, target_id, details) VALUES ($1::uuid, $2, $3, 'professional_application', $4, $5::jsonb)`, [user.sub, user.email, `application.${status}`, String(applicationId), JSON.stringify({ reviewNote })]);
  return json(200, { application: result.rows[0] });
}

async function requireApprovedProfessional(user, db) {
  const result = await db.query(`SELECT status FROM professional_applications WHERE cognito_sub = $1::uuid`, [user.sub]);
  return result.rows[0]?.status === 'approved';
}

async function createBooking(event) {
  const origin = arguments[1];
  const user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');
  const sellerId = Number(data?.sellerId), serviceId = Number(data?.serviceId), customerName = clean(data?.customerName, 80), customerPhone = clean(data?.customerPhone, 30), appointmentDate = clean(data?.appointmentDate, 10), appointmentTime = clean(data?.appointmentTime, 5), notes = clean(data?.notes, 500);
  if (!Number.isInteger(sellerId) || !customerName || !customerPhone || !dateIsValid(appointmentDate) || appointmentDate < today() || !validTime(appointmentTime)) return error(400, 'Choose an available future date and time.');
  const db = await readyDatabase();
  const seller = await db.query('SELECT id, cognito_sub, featured_service FROM seller_profiles WHERE id = $1', [sellerId]);
  if (!seller.rowCount || seller.rows[0].cognito_sub === user.sub) return error(400, 'Choose an available future date and time.');
  const service = Number.isInteger(serviceId) && serviceId > 0 ? await db.query('SELECT name, duration_minutes FROM seller_services WHERE id = $1 AND seller_id = $2', [serviceId, sellerId]) : null;
  const durationMinutes = Number(service?.rows[0]?.duration_minutes || 120);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::integer, hashtext($2))', [sellerId, appointmentDate]);
    const slots = await availableSlots(client, sellerId, appointmentDate, serviceId);
    if (!slots?.available || !slots.slots.includes(appointmentTime)) { await client.query('ROLLBACK'); return error(409, 'That appointment time is no longer available. Choose another slot.'); }
    await client.query(`INSERT INTO booking_requests (seller_id, customer_cognito_sub, customer_email, customer_name, customer_phone, service_name, appointment_date, appointment_time, duration_minutes, notes) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::date, $8::time, $9, $10)`, [sellerId, user.sub, user.email, customerName, customerPhone, service?.rows[0]?.name || seller.rows[0].featured_service, appointmentDate, appointmentTime, durationMinutes, notes]);
    await client.query('COMMIT');
  } catch (cause) {
    await client.query('ROLLBACK').catch(() => {});
    if (cause?.code === '23505') return error(409, 'That time has just been requested. Please choose another slot.');
    throw cause;
  } finally {
    client.release();
  }
  return json(201, { ok: true });
}
async function saveSeller(event) {
  const origin = arguments[1];
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
  const streetAddress = clean(data?.streetAddress, 240);
  const latitude = data?.latitude === '' || data?.latitude == null ? null : Number(data.latitude);
  const longitude = data?.longitude === '' || data?.longitude == null ? null : Number(data.longitude);
  const workStart = clean(data?.workStart, 5) || '09:00';
  const workEnd = clean(data?.workEnd, 5) || '17:00';
  const slotIntervalMinutes = Number(data?.slotIntervalMinutes || 30);
  const availabilityDays =
    clean(data?.availabilityDays, 100) || 'Mon,Tue,Wed,Thu,Fri,Sat';

  if (
    !businessName || !city || !phone || !specialty ||
    !featuredService || !bio ||
    !Number.isInteger(servicePrice) || servicePrice < 0 ||
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) ||
    !validTime(workStart) || !validTime(workEnd) || timeToMinutes(workEnd) <= timeToMinutes(workStart) ||
    ![15, 30, 45, 60].includes(slotIntervalMinutes)
  ) {
    return error(400, 'Complete all seller profile fields.');
  }

  const db = await readyDatabase();
  if (!(await requireApprovedProfessional(user, db))) return error(403, 'Professional approval is required before publishing a profile.');

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
       featured_service, service_price, bio, availability_days, street_address,
       latitude, longitude, slot_interval_minutes)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
       street_address = EXCLUDED.street_address,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       slot_interval_minutes = EXCLUDED.slot_interval_minutes,
       updated_at = NOW()
     RETURNING id, business_name, city, specialty, featured_service, service_price, street_address, latitude, longitude, slot_interval_minutes`,
    [
      user.sub, user.email, businessName, city, phone, specialty,
      featuredService, servicePrice, bio, availabilityDays, streetAddress,
      latitude, longitude, slotIntervalMinutes,
    ],
  );

  const dayNumbers = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const selectedDayNumbers = availabilityDays.split(',').map((day) => dayNumbers[day]).filter((day) => Number.isInteger(day));
  await db.query('DELETE FROM seller_schedule WHERE seller_id = $1', [result.rows[0].id]);
  for (const day of selectedDayNumbers) {
    await db.query('INSERT INTO seller_schedule (seller_id, weekday, start_time, end_time, active) VALUES ($1, $2, $3::time, $4::time, TRUE)', [result.rows[0].id, day, workStart, workEnd]);
  }

  return json(200, { seller: result.rows[0] });
}

async function createService(event) {
  const origin = arguments[1];
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
  const origin = arguments[1];
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
  const origin = arguments[1];
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
  const origin = arguments[1];
  const user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const db = await readyDatabase();
  const application = await db.query('SELECT status, review_note FROM professional_applications WHERE cognito_sub = $1::uuid', [user.sub]);
  if (application.rows[0]?.status !== 'approved') return error(403, application.rowCount ? `Application status: ${application.rows[0].status}` : 'Submit a professional application first.');
  const seller = await db.query(
    `SELECT id, business_name, city, phone, specialty, featured_service,
            service_price, bio, availability_days, street_address, latitude,
            longitude, slot_interval_minutes
     FROM seller_profiles WHERE cognito_sub = $1::uuid`,
    [user.sub],
  );
  if (!seller.rowCount) return json(200, { seller: null, services: [], media: [], bookings: [] });
  const sellerId = seller.rows[0].id;
  const [services, media, bookings, schedule, blockedDates] = await Promise.all([
    db.query('SELECT id, name, price, duration_minutes, description FROM seller_services WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]),
    db.query('SELECT id, media_type, content_type, file_name, object_key FROM seller_media WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]),
    db.query(`SELECT id, customer_email, customer_name, customer_phone, service_name,
                     appointment_date, appointment_time::text AS appointment_time, notes,
                     status, created_at
              FROM booking_requests WHERE seller_id = $1
              ORDER BY appointment_date ASC, appointment_time ASC, created_at DESC`, [sellerId]),
    db.query('SELECT weekday, start_time::text, end_time::text, active FROM seller_schedule WHERE seller_id = $1 ORDER BY weekday', [sellerId]),
    db.query('SELECT id, blocked_date, reason FROM seller_blocked_dates WHERE seller_id = $1 AND blocked_date >= CURRENT_DATE ORDER BY blocked_date', [sellerId]),
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
    schedule: schedule.rows.map((item) => ({ ...item, start_time: item.start_time.slice(0, 5), end_time: item.end_time.slice(0, 5) })),
    blockedDates: blockedDates.rows,
  });
}

async function createBlockedDate(event) {
  const origin = arguments[1], user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');
  const blockedDate = clean(data?.date, 10), reason = clean(data?.reason, 200);
  if (!dateIsValid(blockedDate) || blockedDate < today()) return error(400, 'Choose a future date.');
  const db = await readyDatabase();
  const seller = await db.query('SELECT id FROM seller_profiles WHERE cognito_sub = $1::uuid', [user.sub]);
  if (!seller.rowCount) return error(403, 'Seller profile required.');
  const result = await db.query(`INSERT INTO seller_blocked_dates (seller_id, blocked_date, reason) VALUES ($1, $2::date, $3) ON CONFLICT (seller_id, blocked_date) DO UPDATE SET reason = EXCLUDED.reason RETURNING id, blocked_date, reason`, [seller.rows[0].id, blockedDate, reason]);
  return json(201, { blockedDate: result.rows[0] }, origin);
}

async function deleteBlockedDate(event) {
  const origin = arguments[1], user = claims(event), blockedId = Number(event.pathParameters?.id);
  if (!user) return error(401, 'Sign in required');
  if (!Number.isInteger(blockedId)) return error(400, 'Invalid blocked date.');
  const result = await (await readyDatabase()).query(`DELETE FROM seller_blocked_dates b USING seller_profiles s WHERE b.id = $1 AND b.seller_id = s.id AND s.cognito_sub = $2::uuid RETURNING b.id`, [blockedId, user.sub]);
  if (!result.rowCount) return error(404, 'Blocked date not found.');
  return json(200, { ok: true }, origin);
}

async function listCustomerBookings(event) {
  const origin = arguments[1];
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
  const origin = arguments[1];
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

async function listProducts(event) {
  const origin = arguments[1];
  const result = await (await readyDatabase()).query(`SELECT sku AS id, name, category, description, price_cents, stock_quantity FROM products WHERE active = TRUE ORDER BY created_at, sku`);
  return json(200, { products: result.rows.map((item) => ({ ...item, price: item.price_cents / 100, inStock: item.stock_quantity > 0 })) }, origin);
}

async function createOrder(event) {
  const origin = arguments[1], user = claims(event), data = await body(event);
  if (!user) return error(401, 'Sign in required');
  const fullName = clean(data?.fullName, 120), phone = clean(data?.phone, 30), streetAddress = clean(data?.streetAddress, 240), city = clean(data?.city, 80), province = clean(data?.province, 80);
  const requested = Array.isArray(data?.lines) ? data.lines.slice(0, 30) : [];
  const quantities = new Map();
  for (const line of requested) {
    const sku = clean(line?.id, 80), quantity = Number(line?.quantity);
    if (!sku || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return error(400, 'Every order item needs a valid quantity.');
    quantities.set(sku, (quantities.get(sku) || 0) + quantity);
  }
  if (!fullName || !phone || !streetAddress || !city || !province || !quantities.size) return error(400, 'Complete the delivery details and add at least one product.');
  const db = await readyDatabase(), client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO account_profiles (cognito_sub, email, primary_role, full_name, phone, city, province) VALUES ($1::uuid, $2, 'customer', $3, $4, $5, $6) ON CONFLICT (cognito_sub) DO UPDATE SET email=EXCLUDED.email, full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, city=EXCLUDED.city, province=EXCLUDED.province, updated_at=NOW()`, [user.sub, user.email, fullName, phone, city, province]);
    const skus = [...quantities.keys()];
    const products = await client.query(`SELECT sku, name, price_cents, stock_quantity FROM products WHERE sku = ANY($1::text[]) AND active = TRUE FOR UPDATE`, [skus]);
    if (products.rowCount !== skus.length) { await client.query('ROLLBACK'); return error(409, 'One or more products are no longer available.'); }
    let subtotalCents = 0;
    for (const product of products.rows) {
      const quantity = quantities.get(product.sku);
      if (product.stock_quantity < quantity) { await client.query('ROLLBACK'); return error(409, `${product.name} does not have enough stock.`); }
      subtotalCents += product.price_cents * quantity;
    }
    const deliveryCents = subtotalCents >= 100000 ? 0 : 7500, totalCents = subtotalCents + deliveryCents;
    const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const order = await client.query(`INSERT INTO customer_orders (order_number, customer_cognito_sub, customer_email, full_name, phone, street_address, city, province, subtotal_cents, delivery_cents, total_cents) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, order_number, status, total_cents, created_at`, [orderNumber, user.sub, user.email, fullName, phone, streetAddress, city, province, subtotalCents, deliveryCents, totalCents]);
    for (const product of products.rows) {
      const quantity = quantities.get(product.sku), lineTotal = product.price_cents * quantity;
      await client.query(`INSERT INTO customer_order_items (order_id, product_sku, product_name, unit_price_cents, quantity, line_total_cents) VALUES ($1, $2, $3, $4, $5, $6)`, [order.rows[0].id, product.sku, product.name, product.price_cents, quantity, lineTotal]);
    }
    await client.query('COMMIT');
    return json(201, { order: { ...order.rows[0], total: order.rows[0].total_cents / 100 } }, origin);
  } catch (cause) {
    await client.query('ROLLBACK').catch(() => {});
    throw cause;
  } finally { client.release(); }
}

async function listCustomerOrders(event) {
  const origin = arguments[1], user = claims(event);
  if (!user) return error(401, 'Sign in required');
  const db = await readyDatabase();
  const orders = await db.query(`SELECT id, order_number, status, subtotal_cents, delivery_cents, total_cents, created_at FROM customer_orders WHERE customer_cognito_sub = $1::uuid ORDER BY created_at DESC`, [user.sub]);
  const ids = orders.rows.map((order) => order.id);
  const items = ids.length ? await db.query(`SELECT order_id, product_sku, product_name, unit_price_cents, quantity, line_total_cents FROM customer_order_items WHERE order_id = ANY($1::bigint[]) ORDER BY id`, [ids]) : { rows: [] };
  return json(200, { orders: orders.rows.map((order) => ({ ...order, subtotal: order.subtotal_cents / 100, delivery: order.delivery_cents / 100, total: order.total_cents / 100, items: items.rows.filter((item) => item.order_id === order.id).map((item) => ({ ...item, unitPrice: item.unit_price_cents / 100, lineTotal: item.line_total_cents / 100 })) })) }, origin);
}

async function prepareOrderPayment(event) {
  const orderId = Number(event.orderId), customerSub = clean(event.customerSub, 80);
  if (!Number.isInteger(orderId) || !customerSub) throw new Error('Invalid internal payment request.');
  const db = await readyDatabase();
  const order = await db.query(
    `UPDATE customer_orders
     SET payment_reference = COALESCE(payment_reference, order_number), updated_at = NOW()
     WHERE id = $1 AND customer_cognito_sub = $2::uuid
       AND status IN ('awaiting_payment', 'paid')
     RETURNING id, order_number, customer_email, total_cents, status, payment_reference, ozow_payment_id`,
    [orderId, customerSub],
  );
  if (!order.rowCount) return { ok: false, statusCode: 404, error: 'Order not found or cannot be paid.' };
  const result = order.rows[0];
  return { ok: true, orderId: result.id, orderNumber: result.order_number, email: result.customer_email, totalCents: result.total_cents, status: result.status, reference: result.payment_reference, paymentId: result.ozow_payment_id };
}

async function recordOrderPayment(event) {
  const orderId = Number(event.orderId), paymentId = clean(event.paymentId, 160);
  if (!Number.isInteger(orderId) || !paymentId) throw new Error('Invalid payment record request.');
  const result = await (await readyDatabase()).query(
    `UPDATE customer_orders SET ozow_payment_id = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'awaiting_payment'
       AND (ozow_payment_id IS NULL OR ozow_payment_id = $1)
     RETURNING id, order_number, status`,
    [paymentId, orderId],
  );
  return result.rowCount ? { ok: true, order: result.rows[0] } : { ok: false, statusCode: 409, error: 'Order payment could not be recorded.' };
}

async function confirmOrderPayment(event) {
  const reference = clean(event.reference, 120), paymentId = clean(event.paymentId, 160);
  const amountCents = Number(event.amountCents);
  if (!reference || !paymentId || !Number.isInteger(amountCents) || event.paymentStatus !== 'Successful') throw new Error('Invalid successful payment confirmation.');
  const db = await readyDatabase(), client = await db.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query(
      `SELECT id, order_number, status, total_cents, ozow_payment_id
       FROM customer_orders WHERE payment_reference = $1 FOR UPDATE`,
      [reference],
    );
    if (!order.rowCount) { await client.query('ROLLBACK'); return { ok: false, statusCode: 404, error: 'Payment order not found.' }; }
    const current = order.rows[0];
    if (current.total_cents !== amountCents) { await client.query('ROLLBACK'); return { ok: false, statusCode: 409, error: 'Payment amount does not match the order.' }; }
    if (current.ozow_payment_id && current.ozow_payment_id !== paymentId) { await client.query('ROLLBACK'); return { ok: false, statusCode: 409, error: 'Payment identifier does not match the order.' }; }
    if (current.status === 'paid') { await client.query('COMMIT'); return { ok: true, duplicate: true, orderNumber: current.order_number }; }
    if (current.status !== 'awaiting_payment') { await client.query('ROLLBACK'); return { ok: false, statusCode: 409, error: 'Order is no longer awaiting payment.' }; }
    const items = await client.query(
      `SELECT i.product_sku, i.quantity, p.name, p.stock_quantity
       FROM customer_order_items i JOIN products p ON p.sku = i.product_sku
       WHERE i.order_id = $1 FOR UPDATE OF p`,
      [current.id],
    );
    for (const item of items.rows) {
      if (item.stock_quantity < item.quantity) { await client.query('ROLLBACK'); return { ok: false, statusCode: 409, error: `${item.name} is no longer available in the ordered quantity.` }; }
    }
    for (const item of items.rows) await client.query('UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE sku = $2', [item.quantity, item.product_sku]);
    await client.query(
      `UPDATE customer_orders SET status = 'paid', ozow_payment_id = $1, paid_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [paymentId, current.id],
    );
    await client.query('COMMIT');
    return { ok: true, duplicate: false, orderNumber: current.order_number };
  } catch (cause) {
    await client.query('ROLLBACK').catch(() => {});
    throw cause;
  } finally { client.release(); }
}

async function deleteMedia(event) {
  const origin = arguments[1];
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
  const origin = arguments[1];
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
    if (event.internalAction === 'preparePayment') return prepareOrderPayment(event);
    if (event.internalAction === 'recordPayment') return recordOrderPayment(event);
    if (event.internalAction === 'confirmPayment') return confirmOrderPayment(event);
    const origin = event.headers?.origin || event.headers?.Origin;
    if (event.requestContext?.http?.method === 'OPTIONS') return json(204, {}, origin);
    const method = event.requestContext?.http?.method, path = event.rawPath;
    if (method === 'GET' && path === '/health') return json(200, { status: 'ok', service: 'crownconnect-api', environment: process.env.APP_ENV }, origin);
    if (method === 'GET' && path === '/sellers') return listSellers(event, origin);
    if (method === 'GET' && /^\/sellers\/\d+$/.test(path)) return sellerDetails(Number(path.split('/').pop()), origin);
    if (method === 'GET' && path === '/availability') return availability(event, origin);
    if (method === 'GET' && path === '/products') return listProducts(event, origin);
    if (method === 'POST' && path === '/account') return saveAccount(event, origin);
    if (method === 'GET' && path === '/account') return getAccount(event, origin);
    if (method === 'POST' && path === '/pro/application') return saveProfessionalApplication(event, origin);
    if (method === 'GET' && path === '/pro/application') return getProfessionalApplication(event, origin);
    if (method === 'GET' && path === '/admin/applications') return listProfessionalApplications(event, origin);
    if (method === 'PATCH' && /^\/admin\/applications\/\d+$/.test(path)) return reviewProfessionalApplication(event, origin);
    if (method === 'POST' && path === '/bookings') return createBooking(event, origin);
    if (method === 'POST' && path === '/seller') return saveSeller(event, origin);
    if (method === 'GET' && path === '/seller') return ownSeller(event, origin);
    if (method === 'POST' && path === '/services') return createService(event, origin);
    if (method === 'POST' && path === '/media/upload-url') return createMediaUpload(event, origin);
    if (method === 'DELETE' && /^\/media\/\d+$/.test(path)) return deleteMedia(event, origin);
    if (method === 'GET' && path === '/seller/bookings') return listSellerBookings(event, origin);
    if (method === 'POST' && path === '/seller/blocked-dates') return createBlockedDate(event, origin);
    if (method === 'DELETE' && /^\/seller\/blocked-dates\/\d+$/.test(path)) return deleteBlockedDate(event, origin);
    if (method === 'GET' && path === '/bookings') return listCustomerBookings(event, origin);
    if (method === 'PATCH' && /^\/bookings\/\d+\/cancel$/.test(path)) return cancelCustomerBooking(event, origin);
    if (method === 'PATCH' && /^\/bookings\/\d+\/status$/.test(path)) return updateBookingStatus(event, origin);
    if (method === 'POST' && path === '/orders') return createOrder(event, origin);
    if (method === 'GET' && path === '/orders') return listCustomerOrders(event, origin);
    return error(404, 'Not found');
  } catch (cause) {
    console.error(cause);
    return error(500, 'Unable to complete that request.');
  }
};
