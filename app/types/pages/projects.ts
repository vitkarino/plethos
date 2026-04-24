import type { Project, ProjectUser, User } from '../shared/entities'
import type { UserFormState } from './users'

export type ProjectFormState = {
	title: string
	description: string
}

export type ProjectAssignmentForms = Record<number, number | ''>

export type ProjectsPageState = {
	projects: Project[]
	selectedProject: Project | null
	users: User[]
	projectUsers: ProjectUser[]
	projectForm: ProjectFormState
	userForm: UserFormState
	editingProjectId: number | null
	editingUserId: number | null
	isProjectModalOpen: boolean
	isUserModalOpen: boolean
	isProjectSaving: boolean
	isUserSaving: boolean
	projectFormError: string
	userFormError: string
	assignmentForms: ProjectAssignmentForms
	pageError: string
}
