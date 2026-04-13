import { defineApiHandler, routeResult } from '../../../../../utils/api-response'
import { getUuidRouterParam } from '../../../../../utils/params'
import { useServices } from '../../../../../services/container'

export default defineApiHandler(async (event) => {
  const projectId = getUuidRouterParam(event, 'id')
  const userId = getUuidRouterParam(event, 'userId')

  const member = await useServices().projectsService.addProjectUser(projectId, userId)

  return routeResult(member, {
    statusCode: 201,
  })
})
