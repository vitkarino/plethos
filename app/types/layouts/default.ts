import type { EntityId, Project, ProjectUser, Sex, User } from '../shared/entities'

export type LayoutProjectFormState = {
	title: string
	description: string
}

export type LayoutUserFormState = {
	name: string
	age: number | ''
	sex: Sex
}

export type DefaultLayoutState = {
	projects: Project[]
	selectedProject: Project | null
	users: User[]
	projectUsers: ProjectUser[]
	projectForm: LayoutProjectFormState
	userForm: LayoutUserFormState
	editingProjectId: EntityId | null
	editingUserId: EntityId | null
	isProjectModalOpen: boolean
	isUserModalOpen: boolean
	isProjectSaving: boolean
	isUserSaving: boolean
	projectFormError: string
	userFormError: string
	pageError: string
}
