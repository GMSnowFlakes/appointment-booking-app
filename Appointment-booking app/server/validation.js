const { z } = require('zod');

// ─── Auth ───────────────────────────────────────

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Services ───────────────────────────────────

const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'Service name is required').max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute').max(480),
  price: z.number().min(0, 'Price must be a positive number').max(99999),
  category: z.string().trim().max(100).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
});

const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  duration: z.number().int().min(1).max(480).optional(),
  price: z.number().min(0).max(99999).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().max(500).nullable().optional(),
});

// ─── Appointments ───────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createAppointmentSchema = z.object({
  service_id: z.number().int().positive('Service ID is required'),
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
  time: z.string().regex(timeRegex, 'Time must be HH:MM format'),
  notes: z.string().trim().max(500).nullable().optional(),
});

const rescheduleSchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD format'),
  time: z.string().regex(timeRegex, 'Time must be HH:MM format'),
});

const statusUpdateSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed'], {
    errorMap: () => ({ message: 'Status must be one of: confirmed, cancelled, completed' }),
  }),
});

const roleUpdateSchema = z.object({
  role: z.enum(['customer', 'admin', 'staff'], {
    errorMap: () => ({ message: 'Role must be one of: customer, admin, staff' }),
  }),
});

// ─── Query params ───────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const appointmentFilterSchema = z.object({
  status: z.string().optional(),  // comma-separated values like "confirmed,cancelled"
  date_from: z.string().regex(dateRegex, 'date_from must be YYYY-MM-DD').optional(),
  date_to: z.string().regex(dateRegex, 'date_to must be YYYY-MM-DD').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const serviceSearchSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
});

// ─── Notification Preferences ─────────────────────

const notificationPreferencesSchema = z.object({
  email_reminders: z.boolean({
    errorMap: () => ({ message: 'email_reminders must be a boolean' }),
  }),
});

// ─── Business Settings ───────────────────────────

const BUSINESS_TYPES = [
  'salon', 'barbershop', 'pet-grooming', 'dental-clinic', 'medical-clinic',
  'veterinary', 'tattoo', 'fitness', 'yoga', 'photography',
  'auto-repair', 'beauty', 'massage', 'wellness', 'tutoring',
  'therapy', 'acupuncture', 'tanning', 'car-wash', 'consulting',
  'spa', 'nail-salon', 'med-spa', 'dentist', 'optometrist',
  'chiropractor', 'physical-therapy', 'personal-training', 'music-lessons',
  'art-classes', 'cooking-class', 'wine-tasting', 'event-planning',
  'real-estate', 'financial-advisory', 'legal-consulting', 'custom',
];

const businessSettingsSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  business_type: z.enum(BUSINESS_TYPES, {
    errorMap: () => ({ message: 'Invalid business type' }),
  }),
  business_description: z.string().trim().max(1000).optional().nullable(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').default('#e11d48').optional(),
  category_colors: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')).optional(),
});

// ─── Validation helper ──────────────────────────

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const error = issues.map(e => e.message).join('; ');
    return { valid: false, error };
  }
  return { valid: true, data: result.data };
}

module.exports = {
  registerSchema,
  businessSettingsSchema,
  BUSINESS_TYPES,
  notificationPreferencesSchema,
  loginSchema,
  createServiceSchema,
  updateServiceSchema,
  createAppointmentSchema,
  rescheduleSchema,
  statusUpdateSchema,
  roleUpdateSchema,
  paginationSchema,
  appointmentFilterSchema,
  serviceSearchSchema,
  validate,
};
