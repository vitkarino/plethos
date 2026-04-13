import { defineApiHandler, routeResult } from '../../utils/api-response'
import { parseValidatedBody } from '../../utils/validation'
import { useServices } from '../../services/container'
import { startRecordingSchema } from '../../validation/recordings'

export default defineApiHandler(async (event) => {
  const payload = await parseValidatedBody(event, startRecordingSchema)
  const recording = await useServices().recordingsService.startRecording(payload)

  return routeResult(recording, {
    statusCode: 201,
  })
})
