-- SPORT PostgreSQL Booking & Marketplace Schema
-- Pilot: Alexandria (Padel, Football, Multi-sport, Gyms, Academies)
-- Enforces half-open intervals [start_at, end_at), range exclusion for double-booking prevention,
-- atomic multi-resource reservations (flexible coach + court), and idempotent payment tracking.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS sport;
SET search_path TO sport, public;

-- Users & Role-Based Access Control
CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    role            TEXT NOT NULL CHECK (role IN ('athlete', 'coach', 'venue_operator', 'gym_operator', 'academy_operator', 'admin')),
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE,
    phone           TEXT,
    preferred_lang  TEXT NOT NULL DEFAULT 'en' CHECK (preferred_lang IN ('en', 'ar')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookable Resources (Courts, Pitches, and Coaches)
CREATE TABLE resources (
    id              TEXT PRIMARY KEY,
    kind            TEXT NOT NULL CHECK (kind IN ('court', 'coach')),
    sport           TEXT NOT NULL,
    name            TEXT NOT NULL,
    area            TEXT NOT NULL,
    fixed_venue     TEXT, -- NULL for flexible coaches (unlocks conditional court add-on)
    hourly_egp_minor BIGINT NOT NULL CHECK (hourly_egp_minor >= 0),
    owner_user_id   TEXT REFERENCES users(id),
    published       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations (Top-level booking container)
CREATE TABLE bookings (
    id              TEXT PRIMARY KEY,
    athlete_id      TEXT NOT NULL REFERENCES users(id),
    status          TEXT NOT NULL CHECK (status IN ('HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING')),
    slot_range      TSTZRANGE NOT NULL,
    display_tz      TEXT NOT NULL DEFAULT 'Africa/Cairo',
    custom_venue    TEXT,
    total_egp_minor BIGINT NOT NULL CHECK (total_egp_minor >= 0),
    hold_expires_at TIMESTAMPTZ,
    confirmed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (lower_inc(slot_range) AND NOT upper_inc(slot_range)) -- Half-open [start, end)
);

-- Resource Allocations (1 row per reserved court/pitch and/or coach; atomic unit)
CREATE TABLE booking_allocations (
    id              BIGSERIAL PRIMARY KEY,
    booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    resource_id     TEXT NOT NULL REFERENCES resources(id),
    slot_range      TSTZRANGE NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    price_egp_minor BIGINT NOT NULL CHECK (price_egp_minor >= 0),
    CHECK (lower_inc(slot_range) AND NOT upper_inc(slot_range)),
    -- Prevent overlapping active holds or confirmed bookings on the same resource
    EXCLUDE USING gist (
        resource_id WITH =,
        slot_range WITH &&
    ) WHERE (active = TRUE)
);

CREATE INDEX idx_allocations_booking ON booking_allocations(booking_id);
CREATE INDEX idx_bookings_athlete ON bookings(athlete_id, created_at DESC);
CREATE INDEX idx_bookings_holds ON bookings(hold_expires_at) WHERE status = 'HOLD';

-- Idempotent Payment Attempts & Charges (Paymob / Kashier)
CREATE TABLE payment_attempts (
    id                  TEXT PRIMARY KEY,
    booking_id          TEXT NOT NULL REFERENCES bookings(id),
    provider            TEXT NOT NULL CHECK (provider IN ('paymob', 'kashier', 'simulator')),
    idempotency_key     TEXT NOT NULL UNIQUE,
    amount_egp_minor    BIGINT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('PENDING', 'CAPTURED', 'FAILED', 'REFUND_QUEUED')),
    provider_tx_id      TEXT UNIQUE,
    raw_payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compensation & Outbox Events (Late captures, refunds, notifications)
CREATE TABLE outbox_events (
    id              BIGSERIAL PRIMARY KEY,
    aggregate_type  TEXT NOT NULL,
    aggregate_id    TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gyms & Academies Discovery Directories
CREATE TABLE directory_listings (
    id              TEXT PRIMARY KEY,
    kind            TEXT NOT NULL CHECK (kind IN ('gym', 'academy')),
    name            TEXT NOT NULL,
    sport           TEXT,
    area            TEXT NOT NULL,
    price_egp_minor BIGINT NOT NULL,
    billing_period  TEXT NOT NULL,
    owner_user_id   TEXT REFERENCES users(id),
    published       BOOLEAN NOT NULL DEFAULT TRUE,
    details         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Direct Enquiries (Gyms & Academies Pilot Flow)
CREATE TABLE enquiries (
    id              TEXT PRIMARY KEY,
    listing_id      TEXT NOT NULL REFERENCES directory_listings(id),
    target_name     TEXT,
    kind            TEXT NOT NULL CHECK (kind IN ('gym', 'academy')),
    athlete_id      TEXT REFERENCES users(id),
    full_name       TEXT NOT NULL,
    phone           TEXT NOT NULL,
    participant     TEXT,
    notes           TEXT,
    status          TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'ENROLLED', 'CLOSED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Pilot Data (Alexandria)
INSERT INTO users (id, role, full_name, email, preferred_lang) VALUES
    ('demo-athlete-marwan', 'athlete', 'Marwan', 'marwan@example.eg', 'en'),
    ('coach-fares', 'coach', 'Coach Fares Sadek', 'fares@kicksmash.eg', 'en'),
    ('coach-nour', 'coach', 'Nour Amin', 'nour@sport.eg', 'en'),
    ('coach-omar', 'coach', 'Omar Adel', 'omar@sport.eg', 'en'),
    ('venue-coastal', 'venue_operator', 'Coastal Sports Club', 'ops@coastal.example.eg', 'en'),
    ('admin-sport', 'admin', 'SPORT Operations Admin', 'ops@sport.eg', 'en')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resources (id, kind, sport, name, area, fixed_venue, hourly_egp_minor, owner_user_id) VALUES
    ('football/coastal/0/1', 'court', 'football', 'Coastal Sports Club · Gleem · Pitch 1', 'Gleem', 'Gleem', 50000, 'venue-coastal'),
    ('football/coastal/1/1', 'court', 'football', 'Coastal Sports Club · Smouha · Pitch 1', 'Smouha', 'Smouha', 52500, 'venue-coastal'),
    ('padel-coach', 'coach', 'padel', 'Karim El-Masry (Padel)', 'Smouha', 'Smouha Padel Club', 45000, 'coach-fares'),
    ('nour', 'coach', 'football', 'Nour Amin', 'Smouha', 'Smouha training ground', 35000, 'coach-nour'),
    ('omar', 'coach', 'football', 'Omar Adel', 'Alexandria', NULL, 40000, 'coach-omar')
ON CONFLICT (id) DO NOTHING;
