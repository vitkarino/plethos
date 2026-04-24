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
			.then((response) => readApiResponseData(response, 'Projects were not loaded'))
	}

	public createProject(payload: ProjectPayload) {
		return $fetch<ApiResponse<Project>>('/api/projects', {
			method: 'POST',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Project was not created'))
	}

	public updateProject(projectId: number, payload: ProjectPayload) {
		return $fetch<ApiResponse<Project>>(`/api/projects/${projectId}`, {
			method: 'PUT',
			body: payload,
		}).then((response) => readApiResponseData(response, 'Project was not saved'))
	}

	public deleteProject(projectId: number) {
		return $fetch<ApiResponse<Project>>(`/api/projects/${projectId}`, {
			method: 'DELETE',
		}).then((response) => readApiResponseData(response, 'Project was not deleted'))
	}

	public fetchUsers() {
		return $fetch<ApiResponse<User[]>>('/api/users')
			.then((response) => readApiResponseData(response, 'Users were not loaded'))
	}

	public createUser(payload: UserPayload) {
		return $fetch<ApiResponse<User>>('/api/users', {
			method: 'POST',
			body: payload,
		}).then((response) => readApiResponseData(response, 'User was not created'))
	}

	public updateUser(userId: number, payload: UserPayload) {
		return $fetch<ApiResponse<User>>(`/api/users/${userId}`, {
			method: 'PUT',
			body: payload,
		}).then((response) => readApiResponseData(response, 'User was not saved'))
	}

	public deleteUser(userId: number) {
		return $fetch<ApiResponse<User>>(`/api/users/${userId}`, {
			method: 'DELETE',
		}).then((response) => readApiResponseData(response, 'User was not deleted'))
	}

	public fetchProjectUsers() {
		return $fetch<ApiResponse<ProjectUser[]>>('/api/project_users')
			.then((response) => readApiResponseData(response, 'Project users were not loaded'))
	}

	public assignUser(payload: ProjectUserPayload) {
		return $fetch<ApiResponse<ProjectUser>>('/api/project_users', {
			method: 'POST',
			body: payload,
		}).then((response) => readApiResponseData(response, 'User was not assigned'))
	}

	public unassignUser(payload: ProjectUserPayload) {
		return $fetch<ApiResponse<ProjectUser>>('/api/project_users', {
			method: 'DELETE',
			body: payload,
		}).then((response) => readApiResponseData(response, 'User was not unassigned'))
	}
}
