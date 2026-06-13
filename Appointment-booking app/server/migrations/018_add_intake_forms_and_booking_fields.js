/**
 * Migration 018: Intake forms/waivers + custom booking form fields
 */
module.exports = async ({ run }) => {
  // ── Custom booking form fields per service ──────────────
  await run(`
    CREATE TABLE IF NOT EXISTS service_form_fields (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      label             TEXT NOT NULL,
      field_type        TEXT NOT NULL,        -- 'text', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file'
      options           JSONB,                -- for select/radio: ["opt1", "opt2"]
      required          INTEGER DEFAULT 0,
      placeholder       TEXT,
      sort_order        INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Submitted field values per appointment ──────────────
  await run(`
    CREATE TABLE IF NOT EXISTS appointment_form_data (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      field_id          INTEGER NOT NULL REFERENCES service_form_fields(id) ON DELETE CASCADE,
      value             TEXT,
      file_url          TEXT,                 -- for file uploads
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(appointment_id, field_id)
    )
  `);

  // ── Intake form / waiver templates ──────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS intake_forms (
      id                SERIAL PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      is_waiver         INTEGER DEFAULT 0,    -- 1 = requires signature
      is_active         INTEGER DEFAULT 1,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Intake form sections (questions) ────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS intake_form_sections (
      id                SERIAL PRIMARY KEY,
      form_id           INTEGER NOT NULL REFERENCES intake_forms(id) ON DELETE CASCADE,
      title             TEXT,
      field_type        TEXT NOT NULL,
      label             TEXT NOT NULL,
      options           JSONB,
      required          INTEGER DEFAULT 0,
      sort_order        INTEGER DEFAULT 0,
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);

  // ── Link intake forms to services ───────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS service_intake_forms (
      id                SERIAL PRIMARY KEY,
      service_id        INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      form_id           INTEGER NOT NULL REFERENCES intake_forms(id) ON DELETE CASCADE,
      is_required       INTEGER DEFAULT 1,
      UNIQUE(service_id, form_id)
    )
  `);

  // ── Submitted intake form responses ─────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS intake_form_responses (
      id                SERIAL PRIMARY KEY,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      form_id           INTEGER NOT NULL REFERENCES intake_forms(id) ON DELETE CASCADE,
      section_id        INTEGER NOT NULL REFERENCES intake_form_sections(id) ON DELETE CASCADE,
      value             TEXT,
      signature_url     TEXT,                 -- waiver signature image
      created_at        TIMESTAMP DEFAULT NOW(),
      UNIQUE(appointment_id, form_id, section_id)
    )
  `);
};
