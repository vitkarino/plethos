import type { ApiResponse } from '~/types/shared/api'
import type { EntityId, Project, ProjectUser, Sex } from '~/types/shared/entities'

export const SELECTED_PROJECT_STORAGE_KEY = 'pulso.selectedProjectId'

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
})

export function formatDateValue(value: string) {
	const date = new Date(value)

	return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function getSexLabel(sex: Sex) {
	if (sex === 'female') {
		return 'Жіноча'
	}

	if (sex === 'male') {
		return 'Чоловіча'
	}

	if (sex === 'other') {
		return 'Інше'
	}

	return 'Не вказано'
}

export function getSexIcon(sex: Sex) {
	if (sex === 'female') {
		return '♀'
	}

	if (sex === 'male') {
		return '♂'
	}

	return '•'
}

export function getUserInitials(name: string) {
	const initials = name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('')

	return initials || 'К'
}

export function getUserProjectTitles(projects: Project[], projectUsers: ProjectUser[], userId: EntityId) {
	const projectIds = projectUsers
		.filter((projectUser) => projectUser.user_id === userId)
		.map((projectUser) => projectUser.project_id)

	return projects
		.filter((project) => projectIds.includes(project.id))
		.map((project) => project.title)
}

export function toProjectSlug(title: string) {
	return title
		.toLowerCase()
		.trim()
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
}

export function getProjectSlug(project: Pick<Project, 'id' | 'title'>) {
	return toProjectSlug(project.title) || `project-${project.id}`
}

export function getProjectRoutePath(project: Pick<Project, 'id' | 'title'>, section = '/dashboard') {
	const normalizedSection = section.startsWith('/') ? section : `/${section}`

	return `/p/${getProjectSlug(project)}${normalizedSection}`
}

export function findProjectByRouteName(projects: Project[], projectName: string) {
	return projects.find((project) => getProjectSlug(project) === projectName) ?? null
}

export function readSelectedProjectId() {
	if (typeof window === 'undefined') {
		return null
	}

	const rawValue = window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY)

	return rawValue?.trim() || null
}

export function setSelectedProjectId(projectId: EntityId) {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, String(projectId))
}

export function clearSelectedProjectId() {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY)
}

export function getRequestErrorMessage(error: unknown, fallback: string) {
	if (typeof error === 'object' && error && 'data' in error) {
		const data = (error as {
			data?: {
				statusMessage?: string
				message?: string
				$meta?: {
					message?: string
					error?: {
						message?: string
					}
				}
			}
		}).data

		return data?.$meta?.error?.message ?? data?.$meta?.message ?? data?.statusMessage ?? data?.message ?? fallback
	}

	if (error instanceof Error) {
		return error.message
	}

	return fallback
}

export function readApiResponseData<T>(response: ApiResponse<T>, fallback: string) {
	if (response.$meta.status === 'success' && response.data !== null) {
		return response.data
	}

	const message = response.$meta.status === 'error'
		? response.$meta.error.message
		: fallback

	return Promise.reject(new Error(message))
}
