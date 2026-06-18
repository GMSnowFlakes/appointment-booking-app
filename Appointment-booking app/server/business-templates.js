/**
 * Business Type Templates
 *
 * Each template provides recommended staff roles and services
 * for a given business type. Used during onboarding and in the
 * admin Templates tab.
 *
 * Structure:
 *   [business_type_id]: {
 *     roles:   [ { title, color?, default_max? }, ... ],
 *     services: [ { name, description?, duration (min), price, category }, ... ],
 *   }
 */

const TEMPLATES = {

  // ── Salon & Spa ──────────────────────────────
  salon: {
    roles: [
      { title: 'Stylist' },
      { title: 'Barber' },
      { title: 'Esthetician' },
      { title: 'Massage Therapist' },
      { title: 'Nail Technician' },
    ],
    services: [
      { name: "Women's Haircut",       duration: 45, price: 55.00, category: 'Hair' },
      { name: "Men's Haircut",         duration: 30, price: 35.00, category: 'Hair' },
      { name: "Kids Haircut",          duration: 30, price: 25.00, category: 'Hair' },
      { name: 'Hair Wash',             duration: 15, price: 15.00, category: 'Hair' },
      { name: 'Blow Dry',              duration: 30, price: 30.00, category: 'Hair' },
      { name: 'Hair Styling',          duration: 45, price: 50.00, category: 'Hair' },
      { name: 'Hair Coloring',         duration: 90, price: 85.00, category: 'Hair' },
      { name: 'Highlights',            duration: 90, price: 95.00, category: 'Hair' },
      { name: 'Balayage',              duration: 120, price: 130.00, category: 'Hair' },
      { name: 'Hair Treatment',        duration: 30, price: 35.00, category: 'Hair' },
      { name: 'Keratin Treatment',     duration: 90, price: 120.00, category: 'Hair' },
      { name: 'Facial',                duration: 60, price: 65.00, category: 'Skincare' },
      { name: 'Deep Cleansing Facial', duration: 60, price: 75.00, category: 'Skincare' },
      { name: 'Anti-Aging Facial',     duration: 75, price: 85.00, category: 'Skincare' },
      { name: 'Acne Facial',           duration: 60, price: 70.00, category: 'Skincare' },
      { name: 'Swedish Massage',       duration: 60, price: 75.00, category: 'Massage' },
      { name: 'Hot Stone Massage',     duration: 75, price: 95.00, category: 'Massage' },
      { name: 'Aromatherapy Massage',  duration: 60, price: 85.00, category: 'Massage' },
      { name: 'Body Scrub',            duration: 45, price: 60.00, category: 'Body' },
      { name: 'Manicure',              duration: 30, price: 30.00, category: 'Nails' },
      { name: 'Pedicure',              duration: 45, price: 40.00, category: 'Nails' },
      { name: 'Gel Manicure',          duration: 45, price: 45.00, category: 'Nails' },
      { name: 'Gel Pedicure',          duration: 60, price: 55.00, category: 'Nails' },
      { name: 'Nail Extensions',       duration: 90, price: 70.00, category: 'Nails' },
      { name: 'Nail Art',              duration: 60, price: 50.00, category: 'Nails' },
    ],
  },

  // ── Barbershop ────────────────────────────────
  barbershop: {
    roles: [
      { title: 'Barber' },
    ],
    services: [
      { name: 'Haircut',              duration: 30, price: 30.00, category: 'Haircuts' },
      { name: 'Beard Trim',           duration: 20, price: 20.00, category: 'Grooming' },
      { name: 'Hot Towel Shave',      duration: 30, price: 35.00, category: 'Grooming' },
      { name: 'Head Shave',           duration: 20, price: 25.00, category: 'Haircuts' },
      { name: 'Hair Wash',            duration: 10, price: 10.00, category: 'Haircare' },
      { name: 'Hair Styling',         duration: 20, price: 20.00, category: 'Haircuts' },
      { name: 'Hair Coloring',        duration: 60, price: 55.00, category: 'Haircuts' },
      { name: 'Kids Haircut',         duration: 20, price: 18.00, category: 'Haircuts' },
    ],
  },

  // ── Pet Grooming ───────────────────────────────
  'pet-grooming': {
    roles: [
      { title: 'Groomer' },
    ],
    services: [
      { name: 'Bath & Brush',         duration: 30, price: 30.00, category: 'Grooming' },
      { name: 'Full Grooming',        duration: 90, price: 65.00, category: 'Grooming' },
      { name: 'Nail Trimming',        duration: 15, price: 15.00, category: 'Care' },
      { name: 'Ear Cleaning',         duration: 15, price: 12.00, category: 'Care' },
      { name: 'Teeth Brushing',       duration: 10, price: 10.00, category: 'Care' },
      { name: 'Flea Treatment',       duration: 20, price: 25.00, category: 'Treatment' },
    ],
  },

  // ── Dental Clinic ─────────────────────────────
  'dental-clinic': {
    roles: [
      { title: 'Dentist' },
      { title: 'Dental Hygienist' },
      { title: 'Dental Assistant' },
    ],
    services: [
      { name: 'Dental Consultation',  duration: 30, price: 50.00, category: 'Consultation' },
      { name: 'Teeth Cleaning',       duration: 45, price: 80.00, category: 'Hygiene' },
      { name: 'Filling',              duration: 60, price: 150.00, category: 'Restorative' },
      { name: 'Tooth Extraction',     duration: 45, price: 200.00, category: 'Surgery' },
      { name: 'Root Canal',           duration: 90, price: 400.00, category: 'Restorative' },
      { name: 'Teeth Whitening',      duration: 60, price: 300.00, category: 'Cosmetic' },
      { name: 'Dental X-Ray',         duration: 15, price: 50.00, category: 'Diagnostic' },
    ],
  },

  // ── Medical Clinic ────────────────────────────
  'medical-clinic': {
    roles: [
      { title: 'Doctor' },
      { title: 'Nurse' },
      { title: 'Medical Assistant' },
    ],
    services: [
      { name: 'Consultation',             duration: 30, price: 100.00, category: 'Consultation' },
      { name: 'Follow-Up Consultation',   duration: 15, price: 50.00, category: 'Consultation' },
      { name: 'Vaccination',              duration: 15, price: 25.00, category: 'Preventive' },
      { name: 'Blood Pressure Check',     duration: 10, price: 20.00, category: 'Checkup' },
      { name: 'Medical Certificate',      duration: 20, price: 40.00, category: 'Administrative' },
    ],
  },

  // ── Veterinary Clinic ─────────────────────────
  veterinary: {
    roles: [
      { title: 'Veterinarian' },
      { title: 'Veterinary Assistant' },
    ],
    services: [
      { name: 'Pet Consultation',     duration: 30, price: 60.00, category: 'Consultation' },
      { name: 'Vaccination',          duration: 15, price: 35.00, category: 'Preventive' },
      { name: 'Health Checkup',       duration: 30, price: 50.00, category: 'Checkup' },
      { name: 'Deworming',            duration: 15, price: 25.00, category: 'Treatment' },
      { name: 'Nail Trimming',        duration: 15, price: 15.00, category: 'Grooming' },
    ],
  },

  // ── Tattoo & Piercing ──────────────────────────
  tattoo: {
    roles: [
      { title: 'Tattoo Artist' },
      { title: 'Piercing Specialist' },
    ],
    services: [
      { name: 'Tattoo Consultation',  duration: 30, price: 0.00, category: 'Consultation' },
      { name: 'Small Tattoo',         duration: 60, price: 80.00, category: 'Tattoo' },
      { name: 'Medium Tattoo',        duration: 120, price: 150.00, category: 'Tattoo' },
      { name: 'Large Tattoo',         duration: 240, price: 300.00, category: 'Tattoo' },
      { name: 'Ear Piercing',         duration: 15, price: 30.00, category: 'Piercing' },
      { name: 'Nose Piercing',        duration: 20, price: 40.00, category: 'Piercing' },
    ],
  },

  // ── Fitness Training ───────────────────────────
  fitness: {
    roles: [
      { title: 'Personal Trainer' },
      { title: 'Fitness Coach' },
    ],
    services: [
      { name: 'Personal Training',        duration: 60, price: 50.00, category: 'Training' },
      { name: 'Fitness Assessment',       duration: 45, price: 35.00, category: 'Assessment' },
      { name: 'Group Training',           duration: 45, price: 20.00, category: 'Training' },
      { name: 'Strength Training',        duration: 60, price: 55.00, category: 'Training' },
      { name: 'Weight Loss Program',      duration: 60, price: 60.00, category: 'Program' },
    ],
  },

  // ── Yoga & Pilates ────────────────────────────
  yoga: {
    roles: [
      { title: 'Yoga Instructor' },
      { title: 'Pilates Instructor' },
    ],
    services: [
      { name: 'Private Yoga Session',  duration: 60, price: 45.00, category: 'Yoga' },
      { name: 'Group Yoga Class',      duration: 60, price: 18.00, category: 'Yoga' },
      { name: 'Pilates Session',       duration: 55, price: 40.00, category: 'Pilates' },
      { name: 'Stretching Session',    duration: 45, price: 30.00, category: 'Wellness' },
      { name: 'Beginner Yoga Class',   duration: 50, price: 20.00, category: 'Yoga' },
    ],
  },

  // ── Photography Studio ────────────────────────
  photography: {
    roles: [
      { title: 'Photographer' },
    ],
    services: [
      { name: 'Portrait Session',      duration: 60, price: 100.00, category: 'Portraits' },
      { name: 'Family Photoshoot',     duration: 90, price: 150.00, category: 'Portraits' },
      { name: 'Event Photography',     duration: 180, price: 300.00, category: 'Events' },
      { name: 'Product Photography',   duration: 60, price: 120.00, category: 'Commercial' },
      { name: 'Passport Photo Session',duration: 15, price: 20.00, category: 'Portraits' },
    ],
  },

  // ── Massage Therapy ───────────────────────────
  massage: {
    roles: [
      { title: 'Massage Therapist' },
    ],
    services: [
      { name: 'Swedish Massage',       duration: 60, price: 75.00, category: 'Massage' },
      { name: 'Deep Tissue Massage',   duration: 60, price: 85.00, category: 'Massage' },
      { name: 'Sports Massage',        duration: 60, price: 80.00, category: 'Massage' },
      { name: 'Prenatal Massage',      duration: 60, price: 80.00, category: 'Massage' },
      { name: 'Hot Stone Massage',     duration: 75, price: 95.00, category: 'Massage' },
      { name: 'Reflexology',           duration: 45, price: 60.00, category: 'Massage' },
    ],
  },

  // ── Wellness & Holistic ────────────────────────
  wellness: {
    roles: [
      { title: 'Wellness Practitioner' },
      { title: 'Holistic Therapist' },
    ],
    services: [
      { name: 'Wellness Consultation', duration: 60, price: 75.00, category: 'Consultation' },
      { name: 'Meditation Session',    duration: 45, price: 40.00, category: 'Meditation' },
      { name: 'Reiki Session',         duration: 60, price: 65.00, category: 'Energy' },
      { name: 'Energy Healing',        duration: 60, price: 70.00, category: 'Energy' },
      { name: 'Holistic Assessment',   duration: 75, price: 85.00, category: 'Assessment' },
    ],
  },

  // ── Beauty & Cosmetics ────────────────────────
  beauty: {
    roles: [
      { title: 'Makeup Artist' },
      { title: 'Beauty Specialist' },
    ],
    services: [
      { name: 'Bridal Makeup',        duration: 90, price: 120.00, category: 'Makeup' },
      { name: 'Event Makeup',         duration: 60, price: 75.00, category: 'Makeup' },
      { name: 'Everyday Makeup',      duration: 45, price: 50.00, category: 'Makeup' },
      { name: 'Eyebrow Shaping',      duration: 20, price: 25.00, category: 'Brows' },
      { name: 'Eyelash Extensions',   duration: 90, price: 85.00, category: 'Lashes' },
      { name: 'Eyelash Lift',         duration: 45, price: 55.00, category: 'Lashes' },
      { name: 'Waxing',               duration: 30, price: 35.00, category: 'Hair Removal' },
      { name: 'Threading',            duration: 20, price: 18.00, category: 'Hair Removal' },
    ],
  },

  // ── Nail Salon ────────────────────────────────
  'nail-salon': {
    roles: [
      { title: 'Nail Technician' },
    ],
    services: [
      { name: 'Basic Manicure',       duration: 30, price: 25.00, category: 'Nails' },
      { name: 'Basic Pedicure',       duration: 45, price: 35.00, category: 'Nails' },
      { name: 'Gel Manicure',         duration: 45, price: 40.00, category: 'Nails' },
      { name: 'Gel Pedicure',         duration: 60, price: 50.00, category: 'Nails' },
      { name: 'Acrylic Nails',        duration: 75, price: 55.00, category: 'Nails' },
      { name: 'Nail Extensions',      duration: 90, price: 65.00, category: 'Nails' },
      { name: 'Nail Removal',         duration: 20, price: 15.00, category: 'Nails' },
      { name: 'Nail Repair',          duration: 20, price: 12.00, category: 'Nails' },
      { name: 'Nail Art',             duration: 60, price: 45.00, category: 'Nails' },
      { name: 'French Tips',          duration: 45, price: 35.00, category: 'Nails' },
    ],
  },

  // ── Day Spa ───────────────────────────────────
  spa: {
    roles: [
      { title: 'Spa Therapist' },
    ],
    services: [
      { name: 'Facial',               duration: 60, price: 65.00, category: 'Skincare' },
      { name: 'Body Scrub',           duration: 45, price: 60.00, category: 'Body' },
      { name: 'Body Wrap',            duration: 60, price: 75.00, category: 'Body' },
      { name: 'Relaxation Massage',   duration: 60, price: 70.00, category: 'Massage' },
      { name: 'Hot Stone Massage',    duration: 75, price: 90.00, category: 'Massage' },
      { name: 'Aromatherapy Massage', duration: 60, price: 80.00, category: 'Massage' },
      { name: 'Foot Spa',             duration: 30, price: 40.00, category: 'Body' },
    ],
  },

  // ── Med Spa ──────────────────────────────────
  'med-spa': {
    roles: [
      { title: 'Medical Esthetician' },
    ],
    services: [
      { name: 'Chemical Peel',        duration: 45, price: 120.00, category: 'Treatments' },
      { name: 'Microneedling',        duration: 60, price: 200.00, category: 'Treatments' },
      { name: 'Hydrafacial',          duration: 45, price: 150.00, category: 'Facials' },
      { name: 'Laser Hair Removal',   duration: 30, price: 100.00, category: 'Laser' },
      { name: 'Skin Consultation',    duration: 30, price: 50.00, category: 'Consultation' },
      { name: 'Medical Facial',       duration: 60, price: 130.00, category: 'Facials' },
    ],
  },

  // ── Tutoring & Lessons ─────────────────────────
  tutoring: {
    roles: [
      { title: 'Tutor' },
    ],
    services: [
      { name: 'Math Tutoring',        duration: 60, price: 40.00, category: 'Academic' },
      { name: 'Science Tutoring',     duration: 60, price: 40.00, category: 'Academic' },
      { name: 'Language Tutoring',    duration: 60, price: 45.00, category: 'Languages' },
      { name: 'Test Preparation',     duration: 90, price: 55.00, category: 'Academic' },
      { name: 'Homework Assistance',  duration: 60, price: 35.00, category: 'Academic' },
    ],
  },

  // ── Music Lessons ─────────────────────────────
  'music-lessons': {
    roles: [
      { title: 'Music Teacher' },
    ],
    services: [
      { name: 'Piano Lesson',         duration: 45, price: 45.00, category: 'Music' },
      { name: 'Guitar Lesson',        duration: 45, price: 40.00, category: 'Music' },
      { name: 'Violin Lesson',        duration: 45, price: 50.00, category: 'Music' },
      { name: 'Vocal Coaching',       duration: 45, price: 50.00, category: 'Music' },
      { name: 'Drum Lesson',          duration: 45, price: 40.00, category: 'Music' },
    ],
  },

  // ── Art Classes ────────────────────────────────
  'art-classes': {
    roles: [
      { title: 'Art Instructor' },
    ],
    services: [
      { name: 'Painting Class',       duration: 120, price: 35.00, category: 'Art' },
      { name: 'Drawing Class',        duration: 90, price: 30.00, category: 'Art' },
      { name: 'Watercolor Workshop',  duration: 120, price: 40.00, category: 'Art' },
      { name: "Kids Art Class",       duration: 60, price: 20.00, category: 'Kids' },
      { name: 'Sculpture Workshop',   duration: 150, price: 50.00, category: 'Art' },
    ],
  },

  // ── Cooking Classes ────────────────────────────
  'cooking-class': {
    roles: [
      { title: 'Culinary Instructor' },
    ],
    services: [
      { name: 'Baking Class',              duration: 120, price: 50.00, category: 'Cooking' },
      { name: 'Beginner Cooking Class',    duration: 90, price: 45.00, category: 'Cooking' },
      { name: 'International Cuisine Workshop', duration: 150, price: 65.00, category: 'Cooking' },
      { name: 'Meal Preparation Class',    duration: 90, price: 40.00, category: 'Cooking' },
    ],
  },

  // ── Therapy & Counseling ───────────────────────
  therapy: {
    roles: [
      { title: 'Therapist' },
      { title: 'Counselor' },
    ],
    services: [
      { name: 'Individual Therapy',   duration: 50, price: 90.00, category: 'Therapy' },
      { name: 'Couples Counseling',   duration: 50, price: 120.00, category: 'Therapy' },
      { name: 'Family Counseling',    duration: 60, price: 130.00, category: 'Therapy' },
      { name: 'Mental Health Consultation', duration: 30, price: 60.00, category: 'Consultation' },
    ],
  },

  // ── Acupuncture ────────────────────────────────
  acupuncture: {
    roles: [
      { title: 'Acupuncturist' },
    ],
    services: [
      { name: 'Initial Consultation', duration: 60, price: 80.00, category: 'Consultation' },
      { name: 'Acupuncture Session',  duration: 45, price: 65.00, category: 'Treatment' },
      { name: 'Follow-Up Session',    duration: 30, price: 50.00, category: 'Treatment' },
    ],
  },

  // ── Chiropractor ──────────────────────────────
  chiropractor: {
    roles: [
      { title: 'Chiropractor' },
    ],
    services: [
      { name: 'Chiropractic Consultation', duration: 45, price: 75.00, category: 'Consultation' },
      { name: 'Spinal Adjustment',         duration: 20, price: 55.00, category: 'Adjustment' },
      { name: 'Follow-Up Adjustment',      duration: 15, price: 40.00, category: 'Adjustment' },
    ],
  },

  // ── Physical Therapy ──────────────────────────
  'physical-therapy': {
    roles: [
      { title: 'Physical Therapist' },
    ],
    services: [
      { name: 'Initial Assessment',         duration: 60, price: 85.00, category: 'Assessment' },
      { name: 'Rehabilitation Session',     duration: 45, price: 65.00, category: 'Therapy' },
      { name: 'Mobility Therapy',           duration: 45, price: 65.00, category: 'Therapy' },
      { name: 'Sports Recovery',            duration: 60, price: 75.00, category: 'Therapy' },
    ],
  },

  // ── Personal Training ─────────────────────────
  'personal-training': {
    roles: [
      { title: 'Personal Trainer' },
    ],
    services: [
      { name: 'Personal Training',       duration: 60, price: 50.00, category: 'Training' },
      { name: 'Fitness Assessment',      duration: 45, price: 35.00, category: 'Assessment' },
      { name: 'Group Training',          duration: 45, price: 20.00, category: 'Training' },
      { name: 'Strength Training',       duration: 60, price: 55.00, category: 'Training' },
      { name: 'Weight Loss Program',     duration: 60, price: 60.00, category: 'Program' },
    ],
  },

  // ── Auto Repair ────────────────────────────────
  'auto-repair': {
    roles: [
      { title: 'Mechanic' },
    ],
    services: [
      { name: 'Oil Change',               duration: 30, price: 40.00, category: 'Maintenance' },
      { name: 'Tire Rotation',            duration: 30, price: 25.00, category: 'Maintenance' },
      { name: 'Brake Inspection',         duration: 45, price: 30.00, category: 'Inspection' },
      { name: 'Engine Diagnostics',       duration: 60, price: 100.00, category: 'Diagnostics' },
      { name: 'General Maintenance',      duration: 60, price: 75.00, category: 'Maintenance' },
    ],
  },

  // ── Car Wash & Detailing ──────────────────────
  'car-wash': {
    roles: [
      { title: 'Detailing Technician' },
    ],
    services: [
      { name: 'Exterior Wash',        duration: 20, price: 15.00, category: 'Wash' },
      { name: 'Interior Cleaning',    duration: 45, price: 35.00, category: 'Detailing' },
      { name: 'Full Detailing',       duration: 120, price: 100.00, category: 'Detailing' },
      { name: 'Waxing',               duration: 45, price: 40.00, category: 'Detailing' },
      { name: 'Ceramic Coating',      duration: 180, price: 200.00, category: 'Detailing' },
    ],
  },

  // ── Tanning Salon ─────────────────────────────
  tanning: {
    roles: [
      { title: 'Tanning Specialist' },
    ],
    services: [
      { name: 'Spray Tanning',        duration: 20, price: 30.00, category: 'Tanning' },
      { name: 'UV Tanning Session',   duration: 15, price: 15.00, category: 'Tanning' },
      { name: 'Tanning Consultation', duration: 15, price: 0.00, category: 'Consultation' },
    ],
  },

  // ── Dentist ──────────────────────────────────
  dentist: {
    roles: [
      { title: 'Dentist' },
      { title: 'Dental Hygienist' },
      { title: 'Dental Assistant' },
    ],
    services: [
      { name: 'Dental Consultation',  duration: 30, price: 50.00, category: 'Consultation' },
      { name: 'Teeth Cleaning',       duration: 45, price: 80.00, category: 'Hygiene' },
      { name: 'Filling',              duration: 60, price: 150.00, category: 'Restorative' },
      { name: 'Tooth Extraction',     duration: 45, price: 200.00, category: 'Surgery' },
      { name: 'Root Canal',           duration: 90, price: 400.00, category: 'Restorative' },
      { name: 'Teeth Whitening',      duration: 60, price: 300.00, category: 'Cosmetic' },
      { name: 'Dental X-Ray',         duration: 15, price: 50.00, category: 'Diagnostic' },
    ],
  },

  // ── Optometrist ──────────────────────────────
  optometrist: {
    roles: [
      { title: 'Optometrist' },
      { title: 'Optical Assistant' },
    ],
    services: [
      { name: 'Eye Examination',      duration: 45, price: 80.00, category: 'Examination' },
      { name: 'Contact Lens Fitting', duration: 30, price: 60.00, category: 'Lenses' },
      { name: 'Vision Consultation',  duration: 20, price: 40.00, category: 'Consultation' },
    ],
  },

  // ── Event Planning ─────────────────────────────
  'event-planning': {
    roles: [
      { title: 'Event Planner' },
    ],
    services: [
      { name: 'Wedding Planning Consultation', duration: 90, price: 150.00, category: 'Weddings' },
      { name: 'Birthday Event Planning',       duration: 60, price: 80.00, category: 'Events' },
      { name: 'Corporate Event Planning',      duration: 90, price: 200.00, category: 'Corporate' },
      { name: 'Day-of Coordination',           duration: 480, price: 500.00, category: 'Weddings' },
    ],
  },

  // ── Real Estate ───────────────────────────────
  'real-estate': {
    roles: [
      { title: 'Real Estate Agent' },
    ],
    services: [
      { name: 'Property Viewing',     duration: 45, price: 0.00, category: 'Viewings' },
      { name: 'Buyer Consultation',   duration: 60, price: 0.00, category: 'Consultation' },
      { name: 'Seller Consultation',  duration: 60, price: 0.00, category: 'Consultation' },
      { name: 'Rental Consultation',  duration: 45, price: 0.00, category: 'Consultation' },
    ],
  },

  // ── Financial Advisory ─────────────────────────
  'financial-advisory': {
    roles: [
      { title: 'Financial Advisor' },
    ],
    services: [
      { name: 'Financial Consultation',  duration: 60, price: 150.00, category: 'Consultation' },
      { name: 'Retirement Planning',     duration: 90, price: 250.00, category: 'Planning' },
      { name: 'Investment Planning',     duration: 60, price: 200.00, category: 'Planning' },
      { name: 'Budget Planning',         duration: 45, price: 100.00, category: 'Planning' },
    ],
  },

  // ── Legal Consulting ──────────────────────────
  'legal-consulting': {
    roles: [
      { title: 'Legal Consultant' },
      { title: 'Attorney' },
    ],
    services: [
      { name: 'Legal Consultation',        duration: 30, price: 150.00, category: 'Consultation' },
      { name: 'Contract Review',           duration: 60, price: 300.00, category: 'Documents' },
      { name: 'Estate Planning Consultation', duration: 60, price: 250.00, category: 'Planning' },
    ],
  },

  // ── Consulting ────────────────────────────────
  consulting: {
    roles: [
      { title: 'Consultant' },
    ],
    services: [
      { name: 'Initial Consultation',   duration: 60, price: 150.00, category: 'Consultation' },
      { name: 'Strategy Session',       duration: 90, price: 250.00, category: 'Strategy' },
      { name: 'Follow-Up Consultation', duration: 45, price: 120.00, category: 'Consultation' },
    ],
  },

  // ── Wine Tasting ──────────────────────────────
  'wine-tasting': {
    roles: [
      { title: 'Wine Specialist' },
      { title: 'Sommelier' },
    ],
    services: [
      { name: 'Wine Tasting Session',  duration: 60, price: 35.00, category: 'Tasting' },
      { name: 'Private Wine Tour',     duration: 120, price: 75.00, category: 'Tour' },
      { name: 'Vineyard Experience',   duration: 180, price: 100.00, category: 'Tour' },
    ],
  },

  // ── Custom Business ──────────────────────────
  custom: {
    roles: [
      { title: 'Business Owner' },
    ],
    services: [],  // Empty — user creates their own
  },

};

/**
 * Return the template for a given business type.
 * Returns null if no template exists.
 */
function getTemplate(businessType) {
  return TEMPLATES[businessType] || null;
}

/**
 * Return all template IDs (business type slugs).
 */
function getTemplateTypes() {
  return Object.keys(TEMPLATES);
}

module.exports = { TEMPLATES, getTemplate, getTemplateTypes };
