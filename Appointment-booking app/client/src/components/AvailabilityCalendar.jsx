import { useState, useEffect, useCallback } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function formatTime(time) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isAvailable(dateStr) {
  return dateStr >= fmt(new Date());
}

function getAvailabilityLevel(dateStr, occupiedSlots, duration) {
  if (!isAvailable(dateStr)) return 'past';
  const occupied = occupiedSlots[dateStr];
  if (!occupied || occupied.length === 0) return 'good';
  const occupiedSet = new Set(occupied);
  let availableCount = 0;
  for (const slot of TIME_SLOTS) {
    if (occupiedSet.has(slot)) continue;
    const slotIndex = TIME_SLOTS.indexOf(slot);
    const neededSlots = Math.ceil(duration / 30);
    let fits = true;
    for (let i = 0; i < neededSlots; i++) {
      const nextSlot = TIME_SLOTS[slotIndex + i];
      if (!nextSlot || occupiedSet.has(nextSlot)) { fits = false; break; }
    }
    if (fits) availableCount++;
  }
  if (availableCount === 0) return 'full';
  if (availableCount <= 3) return 'limited';
  return 'good';
}

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Drag-to-Select Time Column ────────────
// A vertical column of 30-min time slots that supports click-to-select and drag-to-scan

function TimeColumn({ slots, selectedSlot, onSelect, isSlotBooked, canFit, disabled, formatTime }) {
  const [dragHover, setDragHover] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectSlot(slot) {
    if (disabled || isSlotBooked(slot) || !canFit(slot)) return;
    onSelect(slot);
  }

  function handleMouseDown(slot) {
    if (disabled || isSlotBooked(slot) || !canFit(slot)) return;
    setIsDragging(true);
    setDragHover(slot);
    onSelect(slot);
  }

  function handleMouseMove(slot) {
    if (!isDragging) return;
    if (isSlotBooked(slot) || !canFit(slot)) return;
    setDragHover(slot);
    onSelect(slot);
  }

  function handleMouseUp() {
    setIsDragging(false);
    setDragHover(null);
  }

  // Global mouseup to catch drags that leave the component
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  return (
    <div
      className="relative select-none"
      onMouseLeave={() => { if (isDragging) { handleMouseUp(); } }}
    >
      <div className="space-y-1">
        {slots.map(slot => {
          const booked = isSlotBooked(slot);
          const fits = canFit(slot);
          const isSelected = slot === selectedSlot;
          const isHovering = slot === dragHover && isDragging;
          const canSelect = !booked && fits;

          let cellStyle;
          if (booked || !fits) {
            cellStyle = 'bg-error-bg text-error/60 line-through cursor-not-allowed border border-red-200';
          } else if (isSelected || isHovering) {
            cellStyle = 'bg-primary text-white shadow-sm border border-primary font-semibold';
          } else {
            cellStyle = 'bg-success-bg text-success hover:bg-green-100 cursor-pointer border border-green-200';
          }

          return (
            <button
              key={slot}
              type="button"
              disabled={disabled || !canSelect}
              onClick={() => selectSlot(slot)}
              onMouseDown={() => handleMouseDown(slot)}
              onMouseEnter={() => handleMouseMove(slot)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSlot(slot); } }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-100 text-left ${cellStyle} ${disabled ? 'cursor-not-allowed' : ''}`}
              style={{ height: '28px' }}
            >
              <span className="flex items-center gap-2">
                {isSelected && (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className={isSelected ? '' : 'ml-[18px]'}>{formatTime(slot)}</span>
                {booked && <span className="ml-auto text-[10px]">Booked</span>}
              </span>
            </button>
          );
        })}
      </div>
      {/* Drag hint */}
      {!disabled && slots.length > 0 && (
        <p className="text-[10px] text-text-muted text-center mt-2">Click or drag to select</p>
      )}
    </div>
  );
}

export default function AvailabilityCalendar({
  date: selectedDate,
  time: selectedTime,
  serviceDuration = 60,
  onSelect,
  disabled = false,
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [occupied, setOccupied] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

  const monthStart = fmt(viewDate);
  const monthEndDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const monthEnd = fmt(monthEndDate);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/availability?start=${monthStart}&end=${monthEnd}`);
      const data = await res.json();
      if (res.ok) setOccupied(data.availability || {});
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [monthStart, monthEnd]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function prevMonth() { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); setExpandedDay(null); }
  function nextMonth() { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); setExpandedDay(null); }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = [];
  if (firstDay > 0) {
    const prev = new Date(year, month, 0);
    const prevDays = prev.getDate();
    for (let i = firstDay - 1; i >= 0; i--) prevMonthDays.push(prevDays - i);
  }

  const calendarDays = [];
  for (const d of prevMonthDays) {
    const dateStr = fmt(new Date(year, month - 1, d));
    calendarDays.push({ day: d, dateStr, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = fmt(new Date(year, month, d));
    calendarDays.push({ day: d, dateStr, isCurrentMonth: true });
  }
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const dateStr = fmt(new Date(year, month + 1, d));
      calendarDays.push({ day: d, dateStr, isCurrentMonth: false });
    }
  }

  function handleDayClick(dateStr) {
    if (disabled || !isAvailable(dateStr)) return;
    setExpandedDay(expandedDay === dateStr ? null : dateStr);
  }

  function handleSlotSelect(dateStr, time) {
    if (disabled) return;
    onSelect(dateStr, time);
    setExpandedDay(null);
  }

  function isSlotOccupied(dateStr, time) {
    return occupied[dateStr]?.includes(time) || false;
  }

  function canFitService(dateStr, slotTime) {
    const dayOccupied = occupied[dateStr];
    if (!dayOccupied?.length) return true;
    const occupiedSet = new Set(dayOccupied);
    const slotIndex = TIME_SLOTS.indexOf(slotTime);
    const neededSlots = Math.ceil(serviceDuration / 30);
    for (let i = 0; i < neededSlots; i++) {
      const nextSlot = TIME_SLOTS[slotIndex + i];
      if (!nextSlot || occupiedSet.has(nextSlot)) return false;
    }
    return true;
  }

  function dayStyle(dateStr) {
    if (!isAvailable(dateStr)) return 'opacity-30 cursor-default';
    const level = getAvailabilityLevel(dateStr, occupied, serviceDuration);
    const isSel = dateStr === selectedDate;
    const isExp = dateStr === expandedDay;
    const base = 'rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer';

    if (isSel) return `${base} bg-primary text-white shadow-sm ring-2 ring-primary/20`;
    if (isExp) return `${base} bg-primary-bg text-primary ring-2 ring-primary/20`;

    switch (level) {
      case 'full': return `${base} bg-error-bg text-error hover:bg-red-100`;
      case 'limited': return `${base} bg-warning-bg text-warning hover:bg-amber-100`;
      case 'good': return `${base} bg-success-bg text-success hover:bg-green-100`;
      default: return `${base} text-text-secondary hover:bg-surface-alt`;
    }
  }

  function dayIndicator(dateStr) {
    if (!isAvailable(dateStr)) return null;
    const level = getAvailabilityLevel(dateStr, occupied, serviceDuration);
    const colors = { full: 'bg-error', limited: 'bg-warning', good: 'bg-success', empty: 'bg-success' };
    return <span className={`block mx-auto mt-0.5 w-1.5 h-1.5 rounded-full ${colors[level] || colors.good}`} />;
  }

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 text-text-secondary hover:text-text hover:bg-surface-alt rounded-xl transition-colors"
        ><ChevronLeft /></button>
        <span className="text-base font-serif font-semibold text-text">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 text-text-secondary hover:text-text hover:bg-surface-alt rounded-xl transition-colors"
        ><ChevronRight /></button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-[11px] font-semibold text-text-muted uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ day, dateStr, isCurrentMonth }) => (
          <button
            key={dateStr}
            type="button"
            disabled={disabled || !isAvailable(dateStr) || !isCurrentMonth}
            onClick={() => handleDayClick(dateStr)}
            className={`p-2 text-center ${!isCurrentMonth ? 'opacity-20' : ''} ${dayStyle(dateStr)} ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <span className="text-sm">{day}</span>
            {isCurrentMonth && dayIndicator(dateStr)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-1">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted pt-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />Available</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" />Limited</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error" />Full</span>
      </div>

      {/* Expanded Day: Drag-to-Select Time Slots */}
      {expandedDay && (
        <div className="animate-slide-up border-t border-border pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-text">
              {new Date(`${expandedDay}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </h4>
            <span className="text-xs text-text-muted">
              {selectedDate === expandedDay && selectedTime
                ? `Selected: ${formatTime(selectedTime)}`
                : 'Select a time'}
            </span>
          </div>

          {!isAvailable(expandedDay) ? (
            <p className="text-sm text-text-muted text-center py-4">This date is in the past.</p>
          ) : (
            <TimeColumn
              slots={TIME_SLOTS}
              selectedSlot={selectedDate === expandedDay ? selectedTime : null}
              onSelect={(slot) => handleSlotSelect(expandedDay, slot)}
              isSlotBooked={(slot) => isSlotOccupied(expandedDay, slot)}
              canFit={(slot) => canFitService(expandedDay, slot)}
              disabled={disabled}
              formatTime={formatTime}
            />
          )}
        </div>
      )}
    </div>
  );
}
