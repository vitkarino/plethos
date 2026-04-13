import { defineApiHandler } from '../../../utils/api-response'
import { getUuidRouterParam } from '../../../utils/params'
import { parseValidatedBody } from '../../../utils/validation'
import { updateProjectSchema } from '../../../validation/projects'
import { useServices } from '../../../services/container'

export default defineApiHandler(async (event) => {
  const id = getUuidRouterParam(event, 'id')
  const payload = await parseValidatedBody(event, updateProjectSchema)

  return useServices().projectsService.updateProject(id, payload)
})
