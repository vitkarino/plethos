import type { Project, ProjectUser, Sex, User } from '../shared/entities'

export type UserFormState = {
	name: string
	age: number | ''
	sex: Sex
}

export type UsersPageState = {
	users: User[]
	projects: Project[]
	projectUsers: ProjectUser[]
	userForm: UserFormState
	editingUserId: number | null
	isUserModalOpen: boolean
	isUserSaving: boolean
	userFormError: string
	pageError: string
}
