/**
 * Migration 021: Invoices, booking widget, webhook support
 */
module.exports = async ({ run }) => {
  // ── Invoices ────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invoice_number    TEXT NOT NULL UNIQUE,
      subtotal_cents    INTEGER NOT NULL,
      discount_cents    INTEGER DEFAULT 0,
      tax_cents         INTEGER DEFAULT 0,
      tip_cents         INTEGER DEFAULT 0,    -- staff tips
      total_cents       INTEGER NOT NULL,
      currency          TEXT DEFAULT 'usd',
      status            TEXT DEFAULT 'paid',   -- draft, sent, paid, void, refunded
      pdf_url           TEXT,                  -- generated PDF path
      notes             TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      paid_at           TIMESTAMP
    )
  `);

  // ── Invoice line items ─────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id                SERIAL PRIMARY KEY,
      invoice_id        INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description       TEXT NOT NULL,
      quantity          INTEGER DEFAULT 1,
      unit_price_cents  INTEGER NOT NULL,
      total_cents       INTEGER NOT NULL,
      type              TEXT DEFAULT 'service', -- service, product, tip, fee, tax
      reference_id      INTEGER,               -- service_id, product_id, etc.
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Embeddable booking widget ──────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS booking_widgets (
      id                SERIAL PRIMARY KEY,
      name              TEXT DEFAULT 'Default Widget',
      widget_token      TEXT NOT NULL UNIQUE,
      is_active         INTEGER DEFAULT 1,
      primary_color     TEXT DEFAULT '#e11d48',
      button_text       TEXT DEFAULT 'Book Now',
      header_text       TEXT DEFAULT 'Book an Appointment',
      show_staff        INTEGER DEFAULT 1,
      show_services     INTEGER DEFAULT 1,
      allowed_services   INTEGER[],             -- null = all services
      allowed_staff     INTEGER[],              -- null = all staff
      custom_css        TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Webhook endpoints ─────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id                SERIAL PRIMARY KEY,
      name              TEXT,
      url               TEXT NOT NULL,
      secret            TEXT,
      events            TEXT[] NOT NULL,        -- array of event types
      is_active         INTEGER DEFAULT 1,
      last_sent_at      TIMESTAMP,
      failure_count     INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Webhook delivery log ───────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id                SERIAL PRIMARY KEY,
      endpoint_id       INTEGER NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
      event_type        TEXT NOT NULL,
      payload           JSONB,
      response_status   INTEGER,
      response_body     TEXT,
      success           INTEGER DEFAULT 0,
      duration_ms       INTEGER,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Automated reminder settings ────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS reminder_settings (
      id                SERIAL PRIMARY KEY,
      reminder_24h      INTEGER DEFAULT 1,
      reminder_1h       INTEGER DEFAULT 0,
      sms_reminder_24h  INTEGER DEFAULT 0,
      sms_reminder_1h   INTEGER DEFAULT 0,
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);
};
