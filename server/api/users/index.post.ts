import { defineApiHandler, routeResult } from '../../utils/api-response'
import { parseValidatedBody } from '../../utils/validation'
import { createUserSchema } from '../../validation/users'
import { useServices } from '../../services/container'

export default defineApiHandler(async (event) => {
  const payload = await parseValidatedBody(event, createUserSchema)
  const user = await useServices().usersService.createUser(payload)

  return routeResult(user, {
    statusCode: 201,
  })
})
