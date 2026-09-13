import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sellerProfiles = sqliteTable('seller_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull(),
  businessName: text('business_name').notNull(),
  city: text('city').notNull(),
  phone: text('phone').notNull(),
  specialty: text('specialty').notNull(),
  featuredService: text('featured_service').notNull(),
  servicePrice: integer('service_price').notNull(),
  bio: text('bio').notNull(),
  availabilityDays: text('availability_days').notNull().default('Mon,Tue,Wed,Thu,Fri,Sat'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_seller_profiles_city_specialty').on(table.city, table.specialty)]);

export const bookingRequests = sqliteTable('booking_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sellerId: integer('seller_id').notNull(),
  customerUserId: text('customer_user_id').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  serviceName: text('service_name').notNull(),
  appointmentDate: text('appointment_date').notNull(),
  appointmentTime: text('appointment_time').notNull(),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  index('idx_booking_requests_seller_date').on(table.sellerId, table.appointmentDate),
  index('idx_booking_requests_customer_created').on(table.customerUserId, table.createdAt),
]);
