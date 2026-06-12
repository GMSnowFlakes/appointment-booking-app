import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

// Generate UI colors from a base hex color
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5L18 18" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
    </svg>
  );
}

function ServiceCard({ service, index, categoryColor }) {
  const catColor = categoryColor || '#e11d48';
  const hasImage = !!service.image_url;

  return (
    <div
      className={`group bg-white rounded-2xl border border-border overflow-hidden opacity-0 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in animate-stagger-${Math.min(index % 6 + 1, 6)}`}
    >
      {/* Dynamic category color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: catColor }} />

      {/* Service image */}
      {hasImage && (
        <div className="relative w-full h-40 overflow-hidden bg-surface-warm">
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{
                  color: catColor,
                  borderColor: hexToRgba(catColor, 0.3),
                  backgroundColor: hexToRgba(catColor, 0.08),
                }}>
                {service.category}
              </span>
              {!hasImage && (
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-text-muted"
                  style={{ backgroundColor: hexToRgba(catColor, 0.1) }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </span>
              )}
            </div>
            <h3 className="font-semibold text-text group-hover:text-primary transition-colors leading-snug">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">{service.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <ClockIcon />
            <span>{service.duration} min</span>
          </div>
          <span className="text-xl font-serif font-bold text-primary">
            ${Number(service.price).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ServiceList() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { settings, getCategoryColor } = useBusiness();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
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
      const url = `/api/services${params.toString() ? '?' + params : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setServices(data.services);
      else setError(data.error || 'Failed to load services');
    } catch {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  // Map categories to their assigned colors for quick lookup
  const categoryColors = useMemo(() => {
    const cats = [...new Set(services.map(s => s.category).filter(Boolean))];
    const map = {};
    cats.forEach((cat, i) => {
      map[cat] = getCategoryColor(cat, i);
    });
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
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl border border-border p-10 max-w-md text-center shadow-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-error-bg rounded-full flex items-center justify-center text-2xl">😕</div>
          <h2 className="text-lg font-semibold text-text mb-2">Something went wrong</h2>
          <p className="text-text-secondary text-sm mb-6">{error}</p>
          <button onClick={() => { setLoading(true); setError(''); fetchServices(); }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all duration-200 shadow-sm">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header — dynamic based on business type */}
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: settings?.primary_color || '#e11d48' }}>
          Our Services
        </span>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-text tracking-tight leading-tight">
          {settings?.business_name || 'Premium Services'},
          <br />
          <span style={{ color: settings?.primary_color || '#e11d48' }}>Expertly Crafted</span>
        </h1>
        <p className="text-text-secondary mt-3 max-w-lg mx-auto">
          {settings?.business_description || 'Choose from our curated range of professional services'}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
            <SearchIcon />
          </div>
          <input type="text" placeholder="Search services..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-all" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text text-sm">✕</button>
          )}
        </div>
        <div className="flex gap-2">
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer">
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {(searchQuery || selectedCategory) && (
            <button onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
              className="px-4 py-3 text-sm text-text-secondary hover:text-text border border-border rounded-xl hover:bg-surface-alt transition-all whitespace-nowrap">Clear</button>
          )}
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || selectedCategory) && !loading && services.length > 0 && (
        <p className="text-sm text-text-muted mb-6">
          Found {services.length} service{services.length !== 1 ? 's' : ''}
          {debouncedSearch && <> matching <span className="font-medium text-text">&ldquo;{debouncedSearch}&rdquo;</span></>}
          {selectedCategory && <> in <span className="font-medium text-text">{selectedCategory}</span></>}
        </p>
      )}

      {/* Services by Category — dynamically colored */}
      {Object.entries(grouped).map(([category, categoryServices]) => {
        const catColor = categoryColors[category] || '#e11d48';
        return (
          <section key={category} className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
              <div>
                <h2 className="text-xl font-serif font-semibold text-text">{category}</h2>
                <p className="text-xs text-text-muted">{categoryServices.length} service{categoryServices.length > 1 ? 's' : ''}</p>
              </div>
              <div className="h-px flex-1 bg-border/70" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} categoryColor={catColor} />
              ))}
            </div>
          </section>
        );
      })}

      {services.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-full flex items-center justify-center text-2xl">📭</div>
          <h3 className="text-lg font-semibold text-text mb-1">No Services Available</h3>
          <p className="text-text-secondary text-sm">Please check back later or try a different search.</p>
        </div>
      )}
    </div>
  );
}
