/**
 * Pure, dependency-free slot generation logic.
 *
 * Kept isolated from Mongoose/Express so it can be unit tested in
 * isolation and reused anywhere (service layer, scripts, tests).
 */

/** Converts "HH:mm" -> minutes since midnight. */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Converts minutes since midnight -> "HH:mm". */
function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Returns true if [start, end) overlaps any break window.
 */
function overlapsBreak(start, end, breaks) {
  return breaks.some((b) => {
    const bStart = toMinutes(b.startTime);
    const bEnd = toMinutes(b.endTime);
    return start < bEnd && end > bStart;
  });
}

/**
 * Generates non-overlapping slot windows for a single day from a set of
 * sessions, a slot duration, and break windows that must be excluded.
 *
 * @param {Array<{startTime: string, endTime: string}>} sessions
 * @param {Array<{startTime: string, endTime: string}>} breaks
 * @param {number} slotDurationMinutes
 * @returns {Array<{startTime: string, endTime: string}>}
 */
function generateDaySlots({ sessions = [], breaks = [], slotDurationMinutes }) {
  if (!slotDurationMinutes || slotDurationMinutes <= 0) {
    throw new Error('slotDurationMinutes must be a positive number');
  }

  const slots = [];

  for (const session of sessions) {
    const sessionStart = toMinutes(session.startTime);
    const sessionEnd = toMinutes(session.endTime);

    for (let cursor = sessionStart; cursor + slotDurationMinutes <= sessionEnd; cursor += slotDurationMinutes) {
      const slotStart = cursor;
      const slotEnd = cursor + slotDurationMinutes;

      // A slot must never be generated if any part of it falls inside a
      // break period - this is enforced here, at generation time, rather
      // than filtered out later, so breaks can never leak through.
      if (overlapsBreak(slotStart, slotEnd, breaks)) continue;

      slots.push({ startTime: toHHMM(slotStart), endTime: toHHMM(slotEnd) });
    }
  }

  return slots;
}

/**
 * Builds full Date objects for a given calendar date (YYYY-MM-DD) + "HH:mm"
 * slot windows, and strips out anything in the past when the date is today.
 * Callers are expected to reject past *dates* (the whole day) before this
 * runs - this function only handles the "today, but the time already
 * passed" case.
 */
function materializeSlotsForDate(dateStr, daySlots, now = new Date()) {
  const isToday = new Date(dateStr).toDateString() === now.toDateString();

  return daySlots
    .map(({ startTime, endTime }) => ({
      startTime,
      endTime,
      start: new Date(`${dateStr}T${startTime}:00`),
      end: new Date(`${dateStr}T${endTime}:00`),
    }))
    .filter(({ start }) => (isToday ? start.getTime() > now.getTime() : true));
}

module.exports = {
  toMinutes,
  toHHMM,
  overlapsBreak,
  generateDaySlots,
  materializeSlotsForDate,
};
