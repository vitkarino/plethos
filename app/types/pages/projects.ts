import type { Project, ProjectUser, User } from '../shared/entities'

export type ProjectFormState = {
	title: string
	description: string
}

export type ProjectAssignmentForms = Record<number, number | ''>

export type ProjectsPageState = {
	projects: Project[]
	users: User[]
	projectUsers: ProjectUser[]
	projectForm: ProjectFormState
	editingProjectId: number | null
	isProjectModalOpen: boolean
	isProjectSaving: boolean
	projectFormError: string
	assignmentForms: ProjectAssignmentForms
	pageError: string
}
