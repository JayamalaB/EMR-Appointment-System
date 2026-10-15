const { z } = require('zod');

const objectId = () => z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const timeString = () => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm 24h format');

const windowSchema = z.object({
  startTime: timeString(),
  endTime: timeString(),
});

const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isWorkingDay: z.boolean(),
  sessions: z.array(windowSchema).default([]),
  breaks: z.array(windowSchema).default([]),
});

const upsertScheduleSchema = z.object({
  body: z.object({
    slotDurationMinutes: z.number().int().min(5).max(180),
    weeklySchedule: z.array(daySchema).length(7, 'weeklySchedule must define all 7 days'),
  }),
  query: z.object({}).optional(),
  params: z.object({ doctorId: objectId() }),
});

module.exports = { upsertScheduleSchema };
