import { randomUUID } from 'node:crypto'
import type { NewProject, Project } from '../db/schema'
import { ProjectsRepository, type ProjectMember } from '../repositories/projectsRepository'
import { UsersRepository } from '../repositories/usersRepository'
import type { ListResult } from '../types/api'
import { conflict, notFound, unprocessable } from '../utils/errors'

export class ProjectsService {
  public constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  public listProjects(limit: number, offset: number): Promise<ListResult<Project>> {
    return this.projectsRepository.list(limit, offset)
  }

  public async getProject(id: string): Promise<Project> {
    const project = await this.projectsRepository.getById(id)

    if (!project) {
      throw notFound(`Project ${id} was not found`)
    }

    return project
  }

  public createProject(payload: Pick<NewProject, 'title' | 'description'>): Promise<Project> {
    return this.projectsRepository.create({
      id: randomUUID(),
      ...payload,
    })
  }

  public async updateProject(
    id: string,
    patch: Partial<Pick<NewProject, 'title' | 'description'>>,
  ): Promise<Project> {
    if (Object.keys(patch).length === 0) {
      throw unprocessable('At least one field is required for update')
    }

    const project = await this.projectsRepository.update(id, patch)

    if (!project) {
      throw notFound(`Project ${id} was not found`)
    }

    return project
  }

  public async deleteProject(id: string): Promise<{ id: string; deleted: true }> {
    const deleted = await this.projectsRepository.delete(id)

    if (!deleted) {
      throw notFound(`Project ${id} was not found`)
    }

    return {
      id,
      deleted: true,
    }
  }

  public async listProjectUsers(projectId: string): Promise<ProjectMember[]> {
    await this.getProject(projectId)
    return this.projectsRepository.listProjectUsers(projectId)
  }

  public async addProjectUser(projectId: string, userId: string): Promise<ProjectMember> {
    await this.getProject(projectId)

    const user = await this.usersRepository.getById(userId)

    if (!user) {
      throw notFound(`User ${userId} was not found`)
    }

    const member = await this.projectsRepository.addProjectUser(projectId, userId)

    if (!member) {
      throw conflict(`User ${userId} is already assigned to project ${projectId}`)
    }

    return member
  }

  public async removeProjectUser(
    projectId: string,
    userId: string,
  ): Promise<{ projectId: string; userId: string; deleted: true }> {
    await this.getProject(projectId)

    const deleted = await this.projectsRepository.removeProjectUser(projectId, userId)

    if (!deleted) {
      throw notFound(`User ${userId} is not assigned to project ${projectId}`)
    }

    return {
      projectId,
      userId,
      deleted: true,
    }
  }
}
