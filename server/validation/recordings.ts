import { z } from 'zod'

export const recordingStatusSchema = z.enum([
  'recording',
  'stopped',
  'extracted',
  'failed',
])

export const startRecordingSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  signalType: z.string().trim().min(1).max(100),
  sampleRate: z.number().int().min(1).max(10_000),
})

export const recordingsListQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: recordingStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
