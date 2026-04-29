import type { ApiResponse } from '~/types/shared/api'
import type { Project, ProjectUser, User } from '~/types/shared/entities'
import { readApiResponseData } from '~/utils/shared'

export type ProjectPayload = Pick<Project, 'title' | 'description'>

export type UserPayload = {
	name: string
	age: number
	sex: User['sex']
}

export type ProjectUserPayload = Pick<ProjectUser, 'project_id' | 'user_id'>

export class PulsoApiModel {
	public fetchProjects() {
		return $fetch<ApiResponse<Project[]>>('/api/projects')
			.then((response) => readApiResponseData(response, 'Проєкти не завантажено'))
	}

	public createProject(payload: ProjectPayload) {
		return $fetch<ApiResponse<Project>>('/api/projects', {
			method: 'POST',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Проєкт не створено'))
	}

	public updateProject(projectId: number, payload: ProjectPayload) {
		return $fetch<ApiResponse<Project>>(`/api/projects/${projectId}`, {
			method: 'PUT',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Проєкт не збережено'))
	}

	public deleteProject(projectId: number) {
		return $fetch<ApiResponse<Project>>(`/api/projects/${projectId}`, {
			method: 'DELETE',
		}).then((response) => readApiResponseData(response, 'Проєкт не видалено'))
	}

	public fetchUsers() {
		return $fetch<ApiResponse<User[]>>('/api/users')
			.then((response) => readApiResponseData(response, 'Користувачів не завантажено'))
	}

	public createUser(payload: UserPayload) {
		return $fetch<ApiResponse<User>>('/api/users', {
			method: 'POST',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Користувача не створено'))
	}

	public updateUser(userId: number, payload: UserPayload) {
		return $fetch<ApiResponse<User>>(`/api/users/${userId}`, {
			method: 'PUT',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Користувача не збережено'))
	}

	public deleteUser(userId: number) {
		return $fetch<ApiResponse<User>>(`/api/users/${userId}`, {
			method: 'DELETE',
		}).then((response) => readApiResponseData(response, 'Користувача не видалено'))
	}

	public fetchProjectUsers() {
		return $fetch<ApiResponse<ProjectUser[]>>('/api/project_users')
			.then((response) => readApiResponseData(response, 'Зв’язки проєктів і користувачів не завантажено'))
	}

	public assignUser(payload: ProjectUserPayload) {
		return $fetch<ApiResponse<ProjectUser>>('/api/project_users', {
			method: 'POST',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Користувача не призначено'))
	}

	public unassignUser(payload: ProjectUserPayload) {
		return $fetch<ApiResponse<ProjectUser>>('/api/project_users', {
			method: 'DELETE',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Користувача не прибрано з проєкту'))
	}
}
