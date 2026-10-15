import { memo } from 'react';

/**
 * Memoized: re-renders only when the actual slot list or selection
 * changes, not on every parent re-render (e.g. while typing in an
 * unrelated filter). Slot lists can be dozens of buttons, so this avoids
 * needless reconciliation work on every keystroke elsewhere on the page.
 */
function SlotGrid({ slots, selected, onSelect }) {
  if (!slots || slots.length === 0) {
    return <div className="empty-state">No slots available for this day.</div>;
  }

  return (
    <div className="slot-grid">
      {slots.map((slot) => {
        const isSelected = selected === slot.startTime;
        return (
          <button
            key={slot.startTime}
            type="button"
            disabled={slot.isBooked}
            className={`slot-btn${isSelected ? ' selected' : ''}`}
            onClick={() => onSelect(slot)}
            title={slot.isBooked ? 'Already booked' : `Book ${slot.startTime}`}
          >
            {slot.startTime}
          </button>
        );
      })}
    </div>
  );
}

export default memo(SlotGrid);
