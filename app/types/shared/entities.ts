export type Sex = 'male' | 'female'

export type User = {
	id: number
	name: string
	age: number
	sex: Sex
	created_at: string
	updated_at: string
}

export type Project = {
	id: number
	title: string
	description: string
	created_at: string
	updated_at: string
}

export type ProjectUser = {
	project_id: number
	user_id: number
	assigned_at: string
}

export type AssignedUser = {
	user: User
	assigned_at: string
}
