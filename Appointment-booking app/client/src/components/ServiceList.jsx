import { useState, useEffect, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { ServiceCardSkeleton } from './Skeleton';
import ScrollReveal from './ScrollReveal';

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ServiceCard({ service, index, categoryColor, onBook }) {
  const catColor = categoryColor || '#e11d48';
  const hasImage = !!service.image_url;

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-border overflow-hidden card-hover animate-fade-in animate-stagger-${Math.min(index % 6 + 1, 6)}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Image / Color Banner */}
      {hasImage ? (
        <div className="relative w-full h-44 overflow-hidden">
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
          <span
            className="absolute top-3 left-3 badge"
            style={{
              background: hexToRgba(catColor, 0.92),
              color: '#fff',
              borderColor: 'transparent',
            }}
          >
            {service.category}
          </span>
        </div>
      ) : (
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${catColor}, ${hexToRgba(catColor, 0.4)})` }}
        />
      )}

      <div className="p-5">
        {/* Category badge (no-image variant) */}
        {!hasImage && (
          <span
            className="badge mb-3"
            style={{
              color: catColor,
              borderColor: hexToRgba(catColor, 0.25),
              background: hexToRgba(catColor, 0.08),
            }}
          >
            {service.category}
          </span>
        )}

        <h3 className="font-semibold text-text text-base leading-snug mb-1 group-hover:text-primary transition-colors">
          {service.name}
        </h3>
        {service.description && (
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{service.description}</p>
        )}

        <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
            </svg>
            {service.duration} min
          </div>
          <span className="text-xl font-serif font-bold" style={{ color: catColor }}>
            ${Number(service.price).toFixed(2)}
          </span>
        </div>

        {onBook && (
          <button
            onClick={() => onBook(service)}
            className="btn btn-primary w-full mt-3 text-sm"
            style={{ background: catColor, boxShadow: `0 2px 8px ${hexToRgba(catColor, 0.35)}` }}
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
}

function HeroSection({ settings }) {
  const color = settings?.primary_color || '#e11d48';
  const name = settings?.business_name || 'Premium Services';

  return (
    <div className="border-b border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="max-w-2xl">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold tracking-widest uppercase mb-6 animate-fade-in"
            style={{ borderColor: `${color}30`, color, background: `${color}08` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            Now Booking
          </div>

          {/* Headline — left-aligned editorial */}
          <h1 className="font-serif font-bold text-text leading-[1.05] tracking-tight animate-fade-in-up"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            {name}
          </h1>
          <p className="mt-4 text-text-secondary leading-relaxed animate-fade-in-up text-base sm:text-[1.0625rem] max-w-lg"
            style={{ animationDelay: '80ms' }}>
            {settings?.business_description || 'Choose from our curated range of professional services, crafted to exceed your expectations.'}
          </p>

          {/* Trust stats — horizontal with dividers */}
          <div className="mt-10 flex items-center gap-0 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            {[
              { val: '500+', label: 'Clients' },
              { val: '4.9', label: 'Rating' },
              { val: '100%', label: 'Satisfaction' },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                {i > 0 && <div className="w-px h-8 bg-border mx-6" />}
                <div>
                  <div className="text-xl font-bold tabular-nums text-text leading-none"
                    style={{ fontFeatureSettings: '"tnum"' }}>{stat.val}</div>
                  <div className="text-[11px] text-text-muted font-medium mt-1 tracking-wide uppercase">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceList({ onNavigateToBook }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { settings, getCategoryColor } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetch('/api/services/categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setCategories(d.categories); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchServices(); }, [debouncedSearch, selectedCategory]);

  async function fetchServices() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategory) params.set('category', selectedCategory);
      const res = await fetch(`/api/services${params.toString() ? '?' + params : ''}`);
      const data = await res.json();
      if (res.ok) setServices(data.services);
      else setError(data.error || 'Failed to load services');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  const categoryColors = useMemo(() => {
    const cats = [...new Set(services.map(s => s.category).filter(Boolean))];
    const map = {};
    cats.forEach((cat, i) => { map[cat] = getCategoryColor(cat, i); });
    return map;
  }, [services, getCategoryColor]);

  const grouped = services.reduce((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <>
        <div className="hero-gradient">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 text-center">
            <div className="w-32 h-4 mx-auto mb-3 rounded-full shimmer" />
            <div className="w-80 h-12 mx-auto rounded-xl shimmer" />
            <div className="w-64 h-4 mx-auto mt-4 rounded-lg shimmer" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="w-full h-12 mb-8 rounded-xl shimmer" />
          <div className="services-grid">
            {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="card card-elevated p-10 max-w-md text-center animate-scale-in">
          <div className="w-14 h-14 mx-auto mb-4 bg-error-bg rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text mb-2">Failed to load services</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(''); fetchServices(); }}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <HeroSection settings={settings} />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5L18 18" strokeLinecap="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search services…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-10 pr-10"
              aria-label="Search services"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Category pills — horizontal scroll on mobile */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap">
              <button
                onClick={() => setSelectedCategory('')}
                className={`btn btn-sm whitespace-nowrap flex-shrink-0 ${
                  !selectedCategory ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                  className={`btn btn-sm whitespace-nowrap flex-shrink-0 ${
                    selectedCategory === cat ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {(searchQuery || selectedCategory) && !loading && services.length > 0 && (
          <p className="text-sm text-text-muted mb-6 animate-fade-in">
            {services.length} service{services.length !== 1 ? 's' : ''} found
            {debouncedSearch && <> for <span className="font-medium text-text">&ldquo;{debouncedSearch}&rdquo;</span></>}
            {selectedCategory && <> in <span className="font-medium text-text">{selectedCategory}</span></>}
          </p>
        )}

        {/* Services by Category */}
        {Object.entries(grouped).map(([category, categoryServices]) => {
          const catColor = categoryColors[category] || '#e11d48';
          return (
            <ScrollReveal key={category} animation="animate-fade-in">
              <section className="mb-14">
                {/* Category header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ background: catColor }} />
                    <h2 className="font-serif font-bold text-text text-xl">{category}</h2>
                    <span className="text-xs text-text-muted font-medium">
                      {categoryServices.length} service{categoryServices.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${hexToRgba(catColor, 0.3)}, transparent)` }} />
                </div>

                <div className="services-grid">
                  {categoryServices.map((service, i) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      index={i}
                      categoryColor={catColor}
                      onBook={onNavigateToBook ? () => onNavigateToBook(service) : undefined}
                    />
                  ))}
                </div>
              </section>
            </ScrollReveal>
          );
        })}

        {/* Empty state */}
        {services.length === 0 && (
          <div className="text-center py-24 animate-scale-in">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-surface-alt border border-border flex items-center justify-center">
              <svg className="w-10 h-10 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                {searchQuery || selectedCategory ? (
                  <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></>
                ) : (
                  <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" strokeLinecap="round" /></>
                )}
              </svg>
            </div>
            <h3 className="text-xl font-serif font-semibold text-text mb-2">
              {searchQuery || selectedCategory ? 'No matching services' : 'No services yet'}
            </h3>
            <p className="text-text-secondary text-sm max-w-xs mx-auto">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or clearing the filters.'
                : 'Services will appear here once added by the business.'}
            </p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                className="btn btn-primary mt-6"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
