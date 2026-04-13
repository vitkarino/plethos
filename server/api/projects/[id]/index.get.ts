import { defineApiHandler } from '../../../utils/api-response'
import { getUuidRouterParam } from '../../../utils/params'
import { useServices } from '../../../services/container'

export default defineApiHandler(async (event) => {
  const id = getUuidRouterParam(event, 'id')
  return useServices().projectsService.getProject(id)
})
