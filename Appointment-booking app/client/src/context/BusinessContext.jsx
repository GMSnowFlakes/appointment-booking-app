import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Helper to get a display name for business type
  function getBusinessTypeLabel(type) {
    const labels = {
      'salon': 'Salon & Spa',
      'barbershop': 'Barbershop',
      'pet-grooming': 'Pet Grooming',
      'dental-clinic': 'Dental Clinic',
      'medical-clinic': 'Medical Clinic',
      'veterinary': 'Veterinary Clinic',
      'tattoo': 'Tattoo & Piercing Studio',
      'fitness': 'Fitness & Personal Training',
      'yoga': 'Yoga & Pilates Studio',
      'photography': 'Photography Studio',
      'auto-repair': 'Auto Repair & Service',
      'beauty': 'Beauty & Cosmetics',
      'massage': 'Massage Therapy',
      'wellness': 'Wellness & Holistic Health',
      'tutoring': 'Tutoring & Music Lessons',
      'therapy': 'Therapy & Counseling',
      'acupuncture': 'Acupuncture & Alternative Medicine',
      'tanning': 'Tanning Salon',
      'car-wash': 'Car Wash & Detailing',
      'consulting': 'Consulting & Professional Services',
      'spa': 'Day Spa',
      'nail-salon': 'Nail Salon',
      'med-spa': 'Med Spa',
      'dentist': 'Dentist',
      'optometrist': 'Optometrist',
      'chiropractor': 'Chiropractor',
      'physical-therapy': 'Physical Therapy',
      'personal-training': 'Personal Training',
      'music-lessons': 'Music Lessons',
      'art-classes': 'Art Classes',
      'cooking-class': 'Cooking Classes',
      'wine-tasting': 'Wine Tasting',
      'event-planning': 'Event Planning',
      'real-estate': 'Real Estate',
      'financial-advisory': 'Financial Advisory',
      'legal-consulting': 'Legal Consulting',
      'custom': 'Custom Business',
    };
    return labels[type] || type || 'Business';
  }

  // Helper to get the color for a category, with fallback to auto-generated palette
  function getCategoryColor(category, index) {
    if (settings?.category_colors && settings.category_colors[category]) {
      return settings.category_colors[category];
    }
    // Auto-generated palette fallback
    const palette = [
      '#f43f5e', '#f59e0b', '#d946ef', '#10b981', '#3b82f6',
      '#8b5cf6', '#06b6d4', '#eab308', '#84cc16', '#f97316',
    ];
    return palette[(index || 0) % palette.length];
  }

  return (
    <BusinessContext.Provider value={{
      settings: settings || { business_name: 'AppointmentBook', business_type: 'salon', business_description: '', primary_color: '#e11d48', category_colors: {} },
      loading,
      refresh: fetchSettings,
      getBusinessTypeLabel,
      getCategoryColor,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
