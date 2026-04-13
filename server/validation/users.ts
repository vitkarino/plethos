import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(130).optional(),
  sex: z.string().trim().min(1).max(20).optional(),
})

export const updateUserSchema = createUserSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
