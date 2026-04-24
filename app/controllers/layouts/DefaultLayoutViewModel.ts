import { reactive } from 'vue'
import type { DefaultLayoutState } from '~/types/layouts/default'
import type { Project, ProjectUser, User } from '~/types/shared/entities'
import {
	clearSelectedProjectId,
	findProjectByRouteName,
	formatDateValue,
	getProjectRoutePath,
	getRequestErrorMessage,
	getSexLabel,
	readSelectedProjectId,
	setSelectedProjectId,
	toProjectSlug,
} from '~/utils/shared'

export class DefaultLayoutViewModel {
	public readonly state = reactive<DefaultLayoutState>({
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
		pageError: '',
	})

	public initialize(projectName = '') {
		return this.refreshPreviewData().catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Preview data was not loaded')
		}).finally(() => {
			this.syncSelectedProject(projectName)
		})
	}

	public refreshPreviewData() {
		return Promise.all([
			this.refreshProjects(),
			this.refreshUsers(),
			this.refreshProjectUsers(),
		]).then(() => undefined)
	}

	public refreshProjects() {
		return $fetch<Project[]>('/api/projects')
			.then((projects) => {
				this.state.projects = projects
				this.syncSelectedProject()
				return projects
			})
	}

	public refreshUsers() {
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

	public syncSelectedProject(projectName = '') {
		const routeProject = projectName ? findProjectByRouteName(this.state.projects, projectName) : null

		if (routeProject) {
			this.selectProject(routeProject)
			return
		}

		const selectedProjectId = readSelectedProjectId()
		const selectedProject = this.state.projects.find((project) => project.id === selectedProjectId) ?? null

		this.state.selectedProject = selectedProject

		if (!selectedProject && selectedProjectId) {
			clearSelectedProjectId()
		}
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

	public workPath(section: string) {
		return this.state.selectedProject ? getProjectRoutePath(this.state.selectedProject, section) : '/projects'
	}

	public selectedProjectLabel() {
		return this.state.selectedProject?.title ?? ''
	}

	public userProjectTitles(userId: number) {
		const projectIds = this.state.projectUsers
			.filter((projectUser) => projectUser.user_id === userId)
			.map((projectUser) => projectUser.project_id)

		const titles = this.state.projects
			.filter((project) => projectIds.includes(project.id))
			.map((project) => project.title)

		return titles.length > 0 ? titles.join(', ') : 'No projects'
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
		if (!this.state.editingProjectId) {
			return Promise.resolve()
		}

		this.state.isProjectSaving = true
		this.state.projectFormError = ''
		this.state.pageError = ''

		return $fetch(`/api/projects/${this.state.editingProjectId}`, {
			method: 'PUT',
			body: {
				title: this.state.projectForm.title,
				description: this.state.projectForm.description,
			},
		}).then(() => {
			this.closeProjectModal()
			return this.refreshProjects()
		}).then(() => undefined).catch((error) => {
			this.state.projectFormError = getRequestErrorMessage(error, 'Project was not saved')
		}).finally(() => {
			this.state.isProjectSaving = false
		})
	}

	public deleteProject(project: Project) {
		if (!this.confirmDelete(`Delete project "${project.title}"?`)) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return $fetch(`/api/projects/${project.id}`, {
			method: 'DELETE',
		}).then(() => {
			if (this.state.editingProjectId === project.id) {
				this.resetProjectForm()
			}

			if (this.state.selectedProject?.id === project.id) {
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
			return this.refreshUsers()
		}).then(() => undefined).catch((error) => {
			this.state.userFormError = getRequestErrorMessage(error, 'User was not saved')
		}).finally(() => {
			this.state.isUserSaving = false
		})
	}

	public deleteUser(user: User) {
		if (!this.confirmDelete(`Delete user "${user.name}"?`)) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return $fetch(`/api/users/${user.id}`, {
			method: 'DELETE',
		}).then(() => {
			if (this.state.editingUserId === user.id) {
				this.resetUserForm()
			}

			return Promise.all([
				this.refreshUsers(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'User was not deleted')
		})
	}

	public projectSlug(title: string) {
		return toProjectSlug(title)
	}

	public sexLabel(sex: User['sex']) {
		return getSexLabel(sex)
	}

	public formatDate(value: string) {
		return formatDateValue(value)
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
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
}
