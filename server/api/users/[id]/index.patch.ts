import { defineApiHandler } from '../../../utils/api-response'
import { getUuidRouterParam } from '../../../utils/params'
import { parseValidatedBody } from '../../../utils/validation'
import { updateUserSchema } from '../../../validation/users'
import { useServices } from '../../../services/container'

export default defineApiHandler(async (event) => {
  const id = getUuidRouterParam(event, 'id')
  const payload = await parseValidatedBody(event, updateUserSchema)

  return useServices().usersService.updateUser(id, payload)
})
