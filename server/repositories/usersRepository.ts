import { count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users, type NewUser, type User } from '../db/schema'
import type { ListResult } from '../types/api'

export class UsersRepository {
  public async list(limit: number, offset: number): Promise<ListResult<User>> {
    const [totalRow] = await db.select({ value: count() }).from(users)

    const items = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      items,
      total: Number(totalRow?.value ?? 0),
    }
  }

  public async getById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return user ?? null
  }

  public async create(payload: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(payload).returning()
    return user
  }

  public async update(id: string, patch: Partial<NewUser>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    return user ?? null
  }

  public async delete(id: string): Promise<boolean> {
    const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    return deleted.length > 0
  }
}
