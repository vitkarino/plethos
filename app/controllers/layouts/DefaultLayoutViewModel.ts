import { reactive } from 'vue'
import { PROJECT_DESCRIPTION_MAX_LENGTH } from '~/constants/forms'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { DefaultLayoutState, SidebarPanelKey } from '~/types/layouts/default'
import type { EntityId, Project, User } from '~/types/shared/entities'
import {
	clearSelectedProjectId,
	findProjectByRouteName,
	formatDateValue,
	getProjectRoutePath,
	getRequestErrorMessage,
	getSexIcon,
	getSexLabel,
	getUserInitials,
	getUserProjectTitles,
	readSelectedProjectId,
	setSelectedProjectId,
	toProjectSlug,
} from '~/utils/shared'

export class DefaultLayoutViewModel {
	private readonly api = new PulsoApiModel()

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
		isSidebarCollapsed: false,
		activeSidebarPanel: null,
		isProjectSaving: false,
		isUserSaving: false,
		projectFormError: '',
		userFormError: '',
		pageError: '',
	})

	public initialize(routeProjectName: unknown = '') {
		return this.refreshPreviewData().catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Дані перегляду не завантажено')
		}).finally(() => {
			this.syncSelectedProjectByRouteParam(routeProjectName)
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
		return this.api.fetchProjects()
			.then((projects) => {
				this.state.projects = projects
				this.syncSelectedProject()
				return projects
			})
	}

	public refreshUsers() {
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
		const project = this.state.projects.find((item) => item.id === projectId)

		return project?.users_count ?? this.state.projectUsers.filter((projectUser) => projectUser.project_id === projectId).length
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

	public syncSelectedProjectByRouteParam(value: unknown) {
		this.syncSelectedProject(this.getRouteProjectName(value))
	}

	public selectProject(project: Project) {
		this.state.selectedProject = project
		setSelectedProjectId(project.id)
	}

	public selectProjectById(projectId: EntityId | number | null) {
		const id = String(projectId ?? '')
		const project = this.state.projects.find((item) => item.id === id) ?? null

		if (project) {
			this.selectProject(project)
		}

		return project
	}

	public switchToProject(project: Project) {
		this.selectProject(project)
	}

	public isProjectSelected(project: Project) {
		return this.state.selectedProject?.id === project.id
	}

	public projectDashboardPath(project: Project) {
		return getProjectRoutePath(project, '/dashboard')
	}

	public projectPath(project: Project, section = '/dashboard') {
		return getProjectRoutePath(project, section)
	}

	public projectSectionFromPath(path: string) {
		const match = path.match(/^\/p\/[^/]+(\/(?:dashboard|records|users|ai))\/?$/)

		return match?.[1] ?? ''
	}

	public workPath(section: string) {
		return this.state.selectedProject ? getProjectRoutePath(this.state.selectedProject, section) : '/projects'
	}

	public selectedProjectLabel() {
		return this.state.selectedProject?.title ?? ''
	}

	public toggleSidebar() {
		this.state.isSidebarCollapsed = !this.state.isSidebarCollapsed
	}

	public toggleSidebarPanel(panel: SidebarPanelKey) {
		this.state.activeSidebarPanel = this.state.activeSidebarPanel === panel ? null : panel
	}

	public openSidebarPanel(panel: SidebarPanelKey) {
		this.state.activeSidebarPanel = panel
	}

	public closeSidebarPanel() {
		this.state.activeSidebarPanel = null
	}

	public syncSidebarPanelFromPath(path: string) {
		const panel = this.sidebarPanelFromPath(path)

		if (panel) {
			this.openSidebarPanel(panel)
		}
	}

	public userProjectTitles(userId: EntityId) {
		const titles = this.userProjectTitlesList(userId)
		return titles.length > 0 ? titles.join(', ') : 'Немає проєктів'
	}

	public userProjectTitlesList(userId: EntityId) {
		return getUserProjectTitles(this.state.projects, this.state.projectUsers, userId)
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

		if (this.state.projectForm.description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
			this.state.projectFormError = `Опис не може перевищувати ${PROJECT_DESCRIPTION_MAX_LENGTH} символів`
			return Promise.resolve()
		}

		this.state.isProjectSaving = true
		this.state.projectFormError = ''
		this.state.pageError = ''

		return this.api.updateProject(this.state.editingProjectId, {
			title: this.state.projectForm.title,
			description: this.state.projectForm.description,
		}).then(() => {
			this.closeProjectModal()
			return this.refreshProjects()
		}).then(() => undefined).catch((error) => {
			this.state.projectFormError = getRequestErrorMessage(error, 'Проєкт не збережено')
		}).finally(() => {
			this.state.isProjectSaving = false
		})
	}

	public deleteProject(project: Project) {
		if (!this.confirmDelete(`Видалити проєкт "${project.title}"?`)) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteProject(project.id).then(() => {
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
			return this.refreshUsers()
		}).then(() => undefined).catch((error) => {
			this.state.userFormError = getRequestErrorMessage(error, 'Користувача не збережено')
		}).finally(() => {
			this.state.isUserSaving = false
		})
	}

	public deleteUser(user: User) {
		if (!this.confirmDelete(`Видалити користувача "${user.name}"?`)) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteUser(user.id).then(() => {
			if (this.state.editingUserId === user.id) {
				this.resetUserForm()
			}

			return Promise.all([
				this.refreshUsers(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Користувача не видалено')
		})
	}

	public projectSlug(title: string) {
		return toProjectSlug(title)
	}

	public sexLabel(sex: User['sex']) {
		return getSexLabel(sex)
	}

	public sexIcon(sex: User['sex']) {
		return getSexIcon(sex)
	}

	public userInitials(name: string) {
		return getUserInitials(name)
	}

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
	}

	private getRouteProjectName(value: unknown) {
		if (Array.isArray(value)) {
			return value[0] ?? ''
		}

		return typeof value === 'string' ? value : ''
	}

	private sidebarPanelFromPath(path: string): SidebarPanelKey | null {
		if (path === '/projects') {
			return 'projects'
		}

		if (path.endsWith('/records')) {
			return 'records'
		}

		if (path.endsWith('/users')) {
			return 'users'
		}

		if (path.endsWith('/ai')) {
			return 'ai'
		}

		return null
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
