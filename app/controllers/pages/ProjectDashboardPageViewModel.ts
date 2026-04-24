import { reactive } from 'vue'
import type { ProjectDashboardPageState } from '~/types/pages/project-dashboard'
import type { AssignedUser, Project, ProjectUser, User } from '~/types/shared/entities'
import { formatDateValue, getRequestErrorMessage, getSexLabel, toProjectSlug } from '~/utils/shared'

export class ProjectDashboardPageViewModel {
	public readonly state = reactive<ProjectDashboardPageState>({
		projectName: '',
		projects: [],
		users: [],
		projectUsers: [],
		project: null,
		assignedUsers: [],
		isLoading: true,
		pageError: '',
	})

	public constructor(projectName: string) {
		this.state.projectName = projectName
	}

	public initialize() {
		this.state.isLoading = true
		this.state.pageError = ''

		return Promise.all([
			this.loadProjects(),
			this.loadUsers(),
			this.loadProjectUsers(),
		]).then(() => {
			this.syncProjectState()
		}).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Project dashboard was not loaded')
		}).finally(() => {
			this.state.isLoading = false
		})
	}

	public sexLabel(sex: User['sex']) {
		return getSexLabel(sex)
	}

	public formatDate(value: string) {
		return formatDateValue(value)
	}

	private loadProjects() {
		return $fetch<Project[]>('/api/projects')
			.then((projects) => {
				this.state.projects = projects
				return projects
			})
	}

	private loadUsers() {
		return $fetch<User[]>('/api/users')
			.then((users) => {
				this.state.users = users
				return users
			})
	}

	private loadProjectUsers() {
		return $fetch<ProjectUser[]>('/api/project_users')
			.then((projectUsers) => {
				this.state.projectUsers = projectUsers
				return projectUsers
			})
	}

	private syncProjectState() {
		this.state.project = this.state.projects.find(
			(item) => toProjectSlug(item.title) === this.state.projectName,
		) ?? null

		if (!this.state.project) {
			this.state.assignedUsers = []
			this.state.pageError = 'Project not found'
			return
		}

		this.state.assignedUsers = this.state.projectUsers
			.filter((assignment) => assignment.project_id === this.state.project?.id)
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
}
