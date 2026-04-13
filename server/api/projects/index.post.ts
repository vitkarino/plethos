import { defineApiHandler, routeResult } from '../../utils/api-response'
import { parseValidatedBody } from '../../utils/validation'
import { createProjectSchema } from '../../validation/projects'
import { useServices } from '../../services/container'

export default defineApiHandler(async (event) => {
  const payload = await parseValidatedBody(event, createProjectSchema)
  const project = await useServices().projectsService.createProject(payload)

  return routeResult(project, {
    statusCode: 201,
  })
})
