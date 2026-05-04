import { reactive } from 'vue'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { ProjectDashboardPageState } from '~/types/pages/project-dashboard'
import type { User } from '~/types/shared/entities'
import {
	findProjectByRouteName,
	formatDateValue,
	getRequestErrorMessage,
	getSexLabel,
	setSelectedProjectId,
} from '~/utils/shared'

export class ProjectDashboardPageViewModel {
	private readonly api = new PulsoApiModel()

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
			this.state.pageError = getRequestErrorMessage(error, 'Дашборд проєкту не завантажено')
		}).finally(() => {
			this.state.isLoading = false
		})
	}

	public sexLabel(sex: User['sex']) {
		return getSexLabel(sex)
	}

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
	}

	private loadProjects() {
		return this.api.fetchProjects()
			.then((projects) => {
				this.state.projects = projects
				return projects
			})
	}

	private loadUsers() {
		return this.api.fetchUsers({
			project_id: this.state.project?.id,
			limit: 100,
		})
			.then((users) => {
				this.state.users = users
				return users
			})
	}

	private loadProjectUsers() {
		return this.api.fetchProjectUsers()
			.then((projectUsers) => {
				this.state.projectUsers = projectUsers
				return projectUsers
			})
	}

	private syncProjectState() {
		this.state.project = findProjectByRouteName(this.state.projects, this.state.projectName)

		if (!this.state.project) {
			this.state.assignedUsers = []
			this.state.pageError = 'Проєкт не знайдено'
			return
		}

		setSelectedProjectId(this.state.project.id)

		this.api.fetchUsers({
			project_id: this.state.project.id,
			limit: 100,
		}).then((users) => {
			this.state.users = users
			this.state.assignedUsers = users.map((user) => {
				return {
					user,
					assigned_at: user.created_at,
				}
			})
		})
	}
}
