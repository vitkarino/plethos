import { defineApiHandler } from '../../../../utils/api-response'
import { getUuidRouterParam } from '../../../../utils/params'
import { useServices } from '../../../../services/container'

export default defineApiHandler(async (event) => {
  const projectId = getUuidRouterParam(event, 'id')
  return useServices().projectsService.listProjectUsers(projectId)
})
