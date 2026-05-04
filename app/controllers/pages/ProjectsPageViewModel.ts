import { reactive } from 'vue'
import { PROJECT_DESCRIPTION_MAX_LENGTH } from '~/constants/forms'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { ProjectsPageState } from '~/types/pages/projects'
import type { AssignedUser, EntityId, Project, User } from '~/types/shared/entities'
import {
	clearSelectedProjectId,
	formatDateValue,
	getProjectRoutePath,
	getRequestErrorMessage,
	getUserInitials,
	readSelectedProjectId,
	setSelectedProjectId,
	toProjectSlug,
} from '~/utils/shared'

export class ProjectsPageViewModel {
	private readonly api = new PulsoApiModel()

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
			this.state.pageError = getRequestErrorMessage(error, 'Дані проєктів не завантажено')
		})
	}

	public refreshProjects() {
		return this.api.fetchProjects()
			.then((projects) => {
				this.state.projects = projects
				this.syncSelectedProject()
				return projects
			})
	}

	public loadUsers() {
		return this.api.fetchUsers()
			.then((users) => {
				this.state.users = users
				return users
			})
	}

	public refreshProjectUsers() {
		return this.api.fetchProjectUsers()
			.then((projectUsers) => {
				this.state.projectUsers = projectUsers
				return projectUsers
			})
	}

	public projectUserCount(projectId: EntityId) {
		return this.state.projectUsers.filter((projectUser) => projectUser.project_id === projectId).length
	}

	public assignedUsers(projectId: EntityId): AssignedUser[] {
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

	public unassignedUsers(projectId: EntityId) {
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

	public userInitials(name: string) {
		return getUserInitials(name)
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
		if (this.state.projectForm.description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
			this.state.projectFormError = `Опис не може перевищувати ${PROJECT_DESCRIPTION_MAX_LENGTH} символів`
			return Promise.resolve()
		}

		const body = {
			title: this.state.projectForm.title,
			description: this.state.projectForm.description,
		}

		this.state.isProjectSaving = true
		this.state.projectFormError = ''
		this.state.pageError = ''

		const request = this.state.editingProjectId
			? this.api.updateProject(this.state.editingProjectId, body).then(() => null)
			: this.api.createProject(body)

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
				this.state.projectFormError = getRequestErrorMessage(error, 'Проєкт не збережено')
			})
			.finally(() => {
				this.state.isProjectSaving = false
			})
	}

	public deleteProject(project: Project | EntityId) {
		const projectId = typeof project === 'string' ? project : project.id
		const title = typeof project === 'string'
			? this.state.projects.find((item) => item.id === projectId)?.title
			: project.title

		if (!this.confirmDelete(title ? `Видалити проєкт "${title}"?` : 'Видалити цей проєкт?')) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteProject(projectId).then(() => {
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
			this.state.pageError = getRequestErrorMessage(error, 'Проєкт не видалено')
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
			this.state.userFormError = 'Некоректний вік'
			return Promise.resolve()
		}

		this.state.isUserSaving = true
		this.state.userFormError = ''
		this.state.pageError = ''

		return this.api.updateUser(this.state.editingUserId, {
			name: this.state.userForm.name,
			age,
			sex: this.state.userForm.sex,
		}).then(() => {
			this.closeUserModal()
			return this.loadUsers()
		}).then(() => undefined).catch((error) => {
			this.state.userFormError = getRequestErrorMessage(error, 'Користувача не збережено')
		}).finally(() => {
			this.state.isUserSaving = false
		})
	}

	public assignUser(projectId: EntityId) {
		const selectedUserId = this.state.assignmentForms[projectId]

		if (!selectedUserId) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.assignUser({
			project_id: projectId,
			user_id: selectedUserId,
		}).then(() => {
			this.state.assignmentForms[projectId] = ''

			return Promise.all([
				this.refreshProjects(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Користувача не призначено')
		})
	}

	public unassignUser(projectId: EntityId, userId: EntityId) {
		this.state.pageError = ''

		return this.api.unassignUser({
			project_id: projectId,
			user_id: userId,
		}).then(() => {
			return Promise.all([
				this.refreshProjects(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Користувача не прибрано з проєкту')
		})
	}

	public projectSlug(title: string) {
		return toProjectSlug(title)
	}

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
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
