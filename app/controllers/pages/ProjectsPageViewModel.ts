import { reactive } from 'vue'
import type { ProjectsPageState } from '~/types/pages/projects'
import type { ApiResponse } from '~/types/shared/api'
import type { AssignedUser, Project, ProjectUser, User } from '~/types/shared/entities'
import { formatDateValue, getRequestErrorMessage, toProjectSlug } from '~/utils/shared'

export class ProjectsPageViewModel {
	public readonly state = reactive<ProjectsPageState>({
		projects: [],
		users: [],
		projectUsers: [],
		projectForm: {
			title: '',
			description: '',
		},
		editingProjectId: null,
		isProjectModalOpen: false,
		isProjectSaving: false,
		projectFormError: '',
		assignmentForms: {},
		pageError: '',
	})

	public initialize() {
		return Promise.all([
			this.refreshProjects(),
			this.loadUsers(),
			this.refreshProjectUsers(),
		]).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Projects data was not loaded')
		})
	}

	public refreshProjects() {
		return $fetch<Project[]>('/api/projects')
			.then((projects) => {
				this.state.projects = projects
				return projects
			})
	}

	public loadUsers() {
		return $fetch<User[]>('/api/users')
			.then((users) => {
				this.state.users = users
				return users
			})
	}

	public refreshProjectUsers() {
		return $fetch<ProjectUser[]>('/api/project_users')
			.then((projectUsers) => {
				this.state.projectUsers = projectUsers
				return projectUsers
			})
	}

	public projectUserCount(projectId: number) {
		return this.state.projectUsers.filter((projectUser) => projectUser.project_id === projectId).length
	}

	public assignedUsers(projectId: number): AssignedUser[] {
		return this.state.projectUsers
			.filter((assignment) => assignment.project_id === projectId)
			.map((assignment) => {
				const user = this.state.users.find((item) => item.id === assignment.user_id)

				return user
					? {
						user,
						assigned_at: assignment.assigned_at,
					}
					: null
			})
			.filter((assignment): assignment is AssignedUser => assignment !== null)
	}

	public unassignedUsers(projectId: number) {
		const assignedUserIds = new Set(
			this.state.projectUsers
				.filter((assignment) => assignment.project_id === projectId)
				.map((assignment) => assignment.user_id),
		)

		return this.state.users.filter((user) => !assignedUserIds.has(user.id))
	}

	public openCreateProjectModal() {
		this.resetProjectForm()
		this.state.isProjectModalOpen = true
	}

	public openEditProjectModal(project: Project) {
		this.state.editingProjectId = project.id
		this.state.projectForm.title = project.title
		this.state.projectForm.description = project.description
		this.state.projectFormError = ''
		this.state.pageError = ''
		this.state.isProjectModalOpen = true
	}

	public closeProjectModal() {
		this.state.isProjectModalOpen = false
		this.resetProjectForm()
	}

	public saveProject() {
		const body = {
			title: this.state.projectForm.title,
			description: this.state.projectForm.description,
		}

		this.state.isProjectSaving = true
		this.state.projectFormError = ''
		this.state.pageError = ''

		const request = this.state.editingProjectId
			? $fetch(`/api/projects/${this.state.editingProjectId}`, {
				method: 'PUT',
				body,
			}).then(() => undefined)
			: $fetch<ApiResponse<Project>>('/api/projects', {
				method: 'POST',
				body,
			}).then((response) => {
				if (response.$meta.status !== 'success') {
					return Promise.reject(new Error(response.$meta.message ?? 'Project was not created'))
				}

				return undefined
			})

		return request
			.then(() => {
				this.closeProjectModal()
				return this.refreshProjects()
			})
			.then(() => undefined)
			.catch((error) => {
				this.state.projectFormError = getRequestErrorMessage(error, 'Project was not saved')
			})
			.finally(() => {
				this.state.isProjectSaving = false
			})
	}

	public deleteProject(projectId: number) {
		this.state.pageError = ''

		return $fetch(`/api/projects/${projectId}`, {
			method: 'DELETE',
		}).then(() => {
			if (this.state.editingProjectId === projectId) {
				this.resetProjectForm()
			}

			return Promise.all([
				this.refreshProjects(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Project was not deleted')
		})
	}

	public assignUser(projectId: number) {
		const selectedUserId = this.state.assignmentForms[projectId]

		if (!selectedUserId) {
			return Promise.resolve()
		}

		const userId = Number(selectedUserId)

		if (!Number.isFinite(userId) || userId <= 0) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return $fetch('/api/project_users', {
			method: 'POST',
			body: {
				project_id: projectId,
				user_id: userId,
			},
		}).then(() => {
			this.state.assignmentForms[projectId] = ''

			return Promise.all([
				this.refreshProjects(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'User was not assigned')
		})
	}

	public unassignUser(projectId: number, userId: number) {
		this.state.pageError = ''

		return $fetch('/api/project_users', {
			method: 'DELETE',
			body: {
				project_id: projectId,
				user_id: userId,
			},
		}).then(() => {
			return Promise.all([
				this.refreshProjects(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'User was not unassigned')
		})
	}

	public projectSlug(title: string) {
		return toProjectSlug(title)
	}

	public formatDate(value: string) {
		return formatDateValue(value)
	}

	private resetProjectForm() {
		this.state.editingProjectId = null
		this.state.projectForm.title = ''
		this.state.projectForm.description = ''
		this.state.projectFormError = ''
	}
}
