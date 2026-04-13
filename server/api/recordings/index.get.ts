import { getQuery } from 'h3'
import { defineApiHandler, routeResult } from '../../utils/api-response'
import { parseValidatedQuery } from '../../utils/validation'
import { useServices } from '../../services/container'
import { recordingsListQuerySchema } from '../../validation/recordings'

export default defineApiHandler(async (event) => {
  const query = parseValidatedQuery(getQuery(event), recordingsListQuerySchema)

  const result = await useServices().recordingsService.listRecordings(
    {
      projectId: query.projectId,
      userId: query.userId,
      status: query.status,
    },
    query.limit,
    query.offset,
  )

  return routeResult(result.items, {
    pagination: {
      limit: query.limit,
      offset: query.offset,
      total: result.total,
    },
  })
})
