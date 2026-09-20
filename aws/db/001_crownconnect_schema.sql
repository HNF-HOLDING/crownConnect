CREATE TABLE account_profiles (
  id BIGSERIAL PRIMARY KEY,
  cognito_sub UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  primary_role TEXT NOT NULL CHECK (primary_role IN ('customer', 'seller')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_applications (
  id BIGSERIAL PRIMARY KEY,
  cognito_sub UUID NOT NULL UNIQUE REFERENCES account_profiles(cognito_sub) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_profiles (
  id BIGSERIAL PRIMARY KEY,
  cognito_sub UUID NOT NULL UNIQUE REFERENCES account_profiles(cognito_sub) ON DELETE CASCADE,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialty TEXT NOT NULL,
  featured_service TEXT NOT NULL,
  service_price INTEGER NOT NULL CHECK (service_price >= 0),
  bio TEXT NOT NULL,
  availability_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_services (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_media (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  content_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE booking_requests (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  customer_cognito_sub UUID NOT NULL REFERENCES account_profiles(cognito_sub) ON DELETE RESTRICT,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seller_profiles_city_specialty ON seller_profiles(city, specialty);
CREATE INDEX idx_seller_services_seller_created ON seller_services(seller_id, created_at DESC);
CREATE INDEX idx_seller_media_seller_created ON seller_media(seller_id, created_at DESC);
CREATE INDEX idx_booking_seller_date ON booking_requests(seller_id, appointment_date);
CREATE INDEX idx_booking_customer_created ON booking_requests(customer_cognito_sub, created_at DESC);
CREATE UNIQUE INDEX booking_active_slot ON booking_requests(seller_id, appointment_date, appointment_time) WHERE status IN ('pending', 'confirmed');
