const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(), // may also arrive via httpOnly cookie
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    department: z.string().optional(), // required for doctors, validated in service
    specialization: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = { loginSchema, refreshSchema, createStaffSchema };
