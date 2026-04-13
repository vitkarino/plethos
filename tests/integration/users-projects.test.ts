import { beforeAll, describe, expect, it } from 'vitest'
import { apiFetch } from './apiClient'
import { bootstrapIntegrationSuite } from './bootstrap'
import { expectApiError } from './helpers'

const seededUserId = '11111111-1111-4111-8111-111111111111'

describe('Users and Projects API', () => {
  beforeAll(async () => {
    await bootstrapIntegrationSuite()
  })

  it('supports users CRUD with envelope responses', async () => {
    const usersList = await apiFetch('/api/users?limit=2&offset=0')

    expect(Array.isArray(usersList.data)).toBe(true)
    expect(usersList.meta.pagination.limit).toBe(2)
    expect(typeof usersList.meta.requestId).toBe('string')

    const created = await apiFetch('/api/users', {
      method: 'POST',
      body: {
        name: 'Test User API',
        age: 27,
        sex: 'female',
      },
    })

    const userId = created.data.id
    expect(userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )

    const fetched = await apiFetch(`/api/users/${userId}`)
    expect(fetched.data.name).toBe('Test User API')

    const updated = await apiFetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: {
        age: 28,
      },
    })

    expect(updated.data.age).toBe(28)

    const removed = await apiFetch(`/api/users/${userId}`, {
      method: 'DELETE',
    })

    expect(removed.data).toEqual({ id: userId, deleted: true })

    await expectApiError(
      () => apiFetch(`/api/users/${userId}`),
      404,
      'NOT_FOUND',
    )
  })

  it('returns 422 for invalid user payload', async () => {
    await expectApiError(
      () =>
        apiFetch('/api/users', {
          method: 'POST',
          body: {
            name: '',
          },
        }),
      422,
      'VALIDATION_ERROR',
    )
  })

  it('supports project users assign/unassign and conflict checks', async () => {
    const projectCreated = await apiFetch('/api/projects', {
      method: 'POST',
      body: {
        title: 'API Integration Project',
        description: 'Created in integration test',
      },
    })

    const projectId = projectCreated.data.id

    const assignment = await apiFetch(`/api/projects/${projectId}/users/${seededUserId}`, {
      method: 'POST',
    })

    expect(assignment.data.id).toBe(seededUserId)

    await expectApiError(
      () =>
        apiFetch(`/api/projects/${projectId}/users/${seededUserId}`, {
          method: 'POST',
        }),
      409,
      'CONFLICT',
    )

    const users = await apiFetch(`/api/projects/${projectId}/users`)
    expect(users.data.some((user: { id: string }) => user.id === seededUserId)).toBe(true)

    const removed = await apiFetch(`/api/projects/${projectId}/users/${seededUserId}`, {
      method: 'DELETE',
    })

    expect(removed.data).toEqual({
      projectId,
      userId: seededUserId,
      deleted: true,
    })

    await expectApiError(
      () =>
        apiFetch(`/api/projects/${projectId}/users/${seededUserId}`, {
          method: 'DELETE',
        }),
      404,
      'NOT_FOUND',
    )
  })
})
