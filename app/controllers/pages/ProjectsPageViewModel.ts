import { reactive } from 'vue'
import type { ProjectsPageState } from '~/types/pages/projects'
import type { ApiResponse } from '~/types/shared/api'
import type { AssignedUser, Project, ProjectUser, User } from '~/types/shared/entities'
import {
	clearSelectedProjectId,
	formatDateValue,
	getProjectRoutePath,
	getRequestErrorMessage,
	readSelectedProjectId,
	setSelectedProjectId,
	toProjectSlug,
} from '~/utils/shared'

export class ProjectsPageViewModel {
	public readonly state = reactive<ProjectsPageState>({
		projects: [],
		selectedProject: null,
		users: [],
		projectUsers: [],
		projectForm: {
			title: '',
			description: '',
		},
		userForm: {
			name: '',
			age: '',
			sex: 'male',
		},
		editingProjectId: null,
		editingUserId: null,
		isProjectModalOpen: false,
		isUserModalOpen: false,
		isProjectSaving: false,
		isUserSaving: false,
		projectFormError: '',
		userFormError: '',
		assignmentForms: {},
		pageError: '',
	})

	public initialize() {
		return Promise.all([
			this.refreshProjects(),
			this.loadUsers(),
			this.refreshProjectUsers(),
		]).then(() => {
			this.syncSelectedProject()
		}).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Projects data was not loaded')
		})
	}

	public refreshProjects() {
		return $fetch<Project[]>('/api/projects')
			.then((projects) => {
				this.state.projects = projects
				this.syncSelectedProject()
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

	public selectProject(project: Project) {
		this.state.selectedProject = project
		setSelectedProjectId(project.id)
	}

	public isProjectSelected(project: Project) {
		return this.state.selectedProject?.id === project.id
	}

	public projectDashboardPath(project: Project) {
		return getProjectRoutePath(project, '/dashboard')
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
			}).then(() => null)
			: $fetch<ApiResponse<Project>>('/api/projects', {
				method: 'POST',
				body,
			}).then((response) => {
				if (response.$meta.status !== 'success' || !response.data) {
					return Promise.reject(new Error(response.$meta.message ?? 'Project was not created'))
				}

				return response.data
			})

		return request
			.then((createdProject) => {
				this.closeProjectModal()

				return this.refreshProjects().then(() => createdProject)
			})
			.then((createdProject) => {
				if (!createdProject) {
					return undefined
				}

				const project = this.state.projects.find((item) => item.id === createdProject.id) ?? createdProject

				this.selectProject(project)

				return navigateTo(this.projectDashboardPath(project))
			})
			.then(() => undefined)
			.catch((error) => {
				this.state.projectFormError = getRequestErrorMessage(error, 'Project was not saved')
			})
			.finally(() => {
				this.state.isProjectSaving = false
			})
	}

	public deleteProject(project: Project | number) {
		const projectId = typeof project === 'number' ? project : project.id
		const title = typeof project === 'number'
			? this.state.projects.find((item) => item.id === projectId)?.title
			: project.title

		if (!this.confirmDelete(title ? `Delete project "${title}"?` : 'Delete this project?')) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return $fetch(`/api/projects/${projectId}`, {
			method: 'DELETE',
		}).then(() => {
			if (this.state.editingProjectId === projectId) {
				this.resetProjectForm()
			}

			if (this.state.selectedProject?.id === projectId) {
				this.state.selectedProject = null
				clearSelectedProjectId()
			}

			return Promise.all([
				this.refreshProjects(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Project was not deleted')
		})
	}

	public openEditUserModal(user: User) {
		this.state.editingUserId = user.id
		this.state.userForm.name = user.name
		this.state.userForm.age = user.age
		this.state.userForm.sex = user.sex
		this.state.userFormError = ''
		this.state.pageError = ''
		this.state.isUserModalOpen = true
	}

	public closeUserModal() {
		this.state.isUserModalOpen = false
		this.resetUserForm()
	}

	public saveUser() {
		if (!this.state.editingUserId) {
			return Promise.resolve()
		}

		const age = Number(this.state.userForm.age)

		if (!Number.isFinite(age)) {
			this.state.userFormError = 'Invalid age'
			return Promise.resolve()
		}

		this.state.isUserSaving = true
		this.state.userFormError = ''
		this.state.pageError = ''

		return $fetch(`/api/users/${this.state.editingUserId}`, {
			method: 'PUT',
			body: {
				name: this.state.userForm.name,
				age,
				sex: this.state.userForm.sex,
			},
		}).then(() => {
			this.closeUserModal()
			return this.loadUsers()
		}).then(() => undefined).catch((error) => {
			this.state.userFormError = getRequestErrorMessage(error, 'User was not saved')
		}).finally(() => {
			this.state.isUserSaving = false
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

	private resetUserForm() {
		this.state.editingUserId = null
		this.state.userForm.name = ''
		this.state.userForm.age = ''
		this.state.userForm.sex = 'male'
		this.state.userFormError = ''
	}

	private syncSelectedProject() {
		const selectedProjectId = readSelectedProjectId()
		const selectedProject = this.state.projects.find((project) => project.id === selectedProjectId) ?? null

		this.state.selectedProject = selectedProject

		if (!selectedProject && selectedProjectId) {
			clearSelectedProjectId()
		}
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
	}
}
