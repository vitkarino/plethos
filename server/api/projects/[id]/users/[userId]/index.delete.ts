import { defineApiHandler } from '../../../../../utils/api-response'
import { getUuidRouterParam } from '../../../../../utils/params'
import { useServices } from '../../../../../services/container'

export default defineApiHandler(async (event) => {
  const projectId = getUuidRouterParam(event, 'id')
  const userId = getUuidRouterParam(event, 'userId')

  return useServices().projectsService.removeProjectUser(projectId, userId)
})
