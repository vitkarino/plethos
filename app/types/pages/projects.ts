import type { EntityId, Project, ProjectUser, User } from '../shared/entities'
import type { UserFormState } from './users'

export type ProjectFormState = {
	title: string
	description: string
}

export type ProjectAssignmentForms = Record<EntityId, EntityId | ''>

export type ProjectsPageState = {
	projects: Project[]
	selectedProject: Project | null
	users: User[]
	projectUsers: ProjectUser[]
	projectForm: ProjectFormState
	userForm: UserFormState
	editingProjectId: EntityId | null
	editingUserId: EntityId | null
	isProjectModalOpen: boolean
	isUserModalOpen: boolean
	isProjectSaving: boolean
	isUserSaving: boolean
	projectFormError: string
	userFormError: string
	assignmentForms: ProjectAssignmentForms
	pageError: string
}
