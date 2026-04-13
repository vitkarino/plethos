import { defineApiHandler, routeResult } from '../../utils/api-response'
import { getPagination } from '../../utils/pagination'
import { useServices } from '../../services/container'

export default defineApiHandler(async (event) => {
  const { limit, offset } = getPagination(event)
  const result = await useServices().usersService.listUsers(limit, offset)

  return routeResult(result.items, {
    pagination: {
      limit,
      offset,
      total: result.total,
    },
  })
})
