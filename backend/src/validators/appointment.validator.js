const { z } = require('zod');

const objectId = () => z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createAppointmentSchema = z.object({
  body: z
    .object({
      doctor: objectId(),
      department: objectId(),
      // Accepts any parseable date-time string (ISO with offset, or a plain
      // "YYYY-MM-DDTHH:mm:ss" local string as sent by the slot grid); actual
      // validity (real Date, matches a real slot, not in the past) is
      // checked in appointment.service.js where the doctor's schedule is
      // available to validate against.
      slotStart: z.string().min(1, 'slotStart is required'),
      patientId: objectId().optional(), // existing patient
      newPatient: z
        .object({
          name: z.string().min(2),
          mobile: z.string().min(7).max(15),
          gender: z.enum(['male', 'female', 'other']).optional(),
          dateOfBirth: z.string().optional(),
          address: z.string().optional(),
        })
        .optional(),
      purpose: z.string().max(500).optional(),
    })
    .refine((data) => data.patientId || data.newPatient, {
      message: 'Either patientId or newPatient must be provided',
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateAppointmentSchema = z.object({
  body: z.object({
    purpose: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    consultationNotes: z.string().max(5000).optional(),
    status: z.enum(['scheduled', 'arrived', 'completed', 'cancelled']).optional(),
    cancelReason: z.string().max(500).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: objectId() }),
});

const listAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    doctor: objectId().optional(),
    department: objectId().optional(),
    status: z.enum(['scheduled', 'arrived', 'completed', 'cancelled']).optional(),
    search: z.string().optional(), // patient name / mobile
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
  params: z.object({}).optional(),
});

const slotsQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    doctor: objectId(),
    date: z.string().min(1, 'date (YYYY-MM-DD) is required'),
  }),
  params: z.object({}).optional(),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsSchema,
  slotsQuerySchema,
};
