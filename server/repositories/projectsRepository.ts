import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import {
  projects,
  projectUsers,
  users,
  type NewProject,
  type Project,
} from '../db/schema'
import type { ListResult } from '../types/api'

export interface ProjectMember {
  id: string
  name: string
  age: number | null
  sex: string | null
  createdAt: Date
  updatedAt: Date
  assignedAt: Date
}

export class ProjectsRepository {
  public async list(limit: number, offset: number): Promise<ListResult<Project>> {
    const [totalRow] = await db.select({ value: count() }).from(projects)

    const items = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      items,
      total: Number(totalRow?.value ?? 0),
    }
  }

  public async getById(id: string): Promise<Project | null> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    return project ?? null
  }

  public async create(payload: NewProject): Promise<Project> {
    const [project] = await db.insert(projects).values(payload).returning()
    return project
  }

  public async update(id: string, patch: Partial<NewProject>): Promise<Project | null> {
    const [project] = await db
      .update(projects)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning()

    return project ?? null
  }

  public async delete(id: string): Promise<boolean> {
    const deleted = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id })

    return deleted.length > 0
  }

  public async listProjectUsers(projectId: string): Promise<ProjectMember[]> {
    return db
      .select({
        id: users.id,
        name: users.name,
        age: users.age,
        sex: users.sex,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        assignedAt: projectUsers.assignedAt,
      })
      .from(projectUsers)
      .innerJoin(users, eq(users.id, projectUsers.userId))
      .where(eq(projectUsers.projectId, projectId))
      .orderBy(desc(projectUsers.assignedAt))
  }

  public async addProjectUser(projectId: string, userId: string): Promise<ProjectMember | null> {
    const inserted = await db
      .insert(projectUsers)
      .values({ projectId, userId })
      .onConflictDoNothing()
      .returning()

    if (inserted.length === 0) {
      return null
    }

    return this.getProjectUser(projectId, userId)
  }

  public async removeProjectUser(projectId: string, userId: string): Promise<boolean> {
    const deleted = await db
      .delete(projectUsers)
      .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId)))
      .returning({ userId: projectUsers.userId })

    return deleted.length > 0
  }

  public async getProjectUser(projectId: string, userId: string): Promise<ProjectMember | null> {
    const [member] = await db
      .select({
        id: users.id,
        name: users.name,
        age: users.age,
        sex: users.sex,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        assignedAt: projectUsers.assignedAt,
      })
      .from(projectUsers)
      .innerJoin(users, eq(users.id, projectUsers.userId))
      .where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId)))
      .limit(1)

    return member ?? null
  }
}
