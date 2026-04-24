import type { AssignedUser, Project, ProjectUser, User } from '../shared/entities'

export type ProjectDashboardPageState = {
	projectName: string
	projects: Project[]
	users: User[]
	projectUsers: ProjectUser[]
	project: Project | null
	assignedUsers: AssignedUser[]
	isLoading: boolean
	pageError: string
}
