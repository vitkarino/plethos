import { randomUUID } from 'node:crypto'
import type { NewUser, User } from '../db/schema'
import { UsersRepository } from '../repositories/usersRepository'
import type { ListResult } from '../types/api'
import { notFound, unprocessable } from '../utils/errors'

export class UsersService {
  public constructor(private readonly usersRepository: UsersRepository) {}

  public listUsers(limit: number, offset: number): Promise<ListResult<User>> {
    return this.usersRepository.list(limit, offset)
  }

  public async getUser(id: string): Promise<User> {
    const user = await this.usersRepository.getById(id)

    if (!user) {
      throw notFound(`User ${id} was not found`)
    }

    return user
  }

  public createUser(payload: Pick<NewUser, 'name' | 'age' | 'sex'>): Promise<User> {
    return this.usersRepository.create({
      id: randomUUID(),
      ...payload,
    })
  }

  public async updateUser(
    id: string,
    patch: Partial<Pick<NewUser, 'name' | 'age' | 'sex'>>,
  ): Promise<User> {
    if (Object.keys(patch).length === 0) {
      throw unprocessable('At least one field is required for update')
    }

    const user = await this.usersRepository.update(id, patch)

    if (!user) {
      throw notFound(`User ${id} was not found`)
    }

    return user
  }

  public async deleteUser(id: string): Promise<{ id: string; deleted: true }> {
    const deleted = await this.usersRepository.delete(id)

    if (!deleted) {
      throw notFound(`User ${id} was not found`)
    }

    return {
      id,
      deleted: true,
    }
  }
}
