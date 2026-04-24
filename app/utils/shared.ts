import type { Project, Sex } from '~/types/shared/entities'

export const SELECTED_PROJECT_STORAGE_KEY = 'pulso.selectedProjectId'

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
})

export function formatDateValue(value: string) {
	return dateFormatter.format(new Date(value))
}

export function getSexLabel(sex: Sex) {
	return sex === 'female' ? 'Female' : 'Male'
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
	const normalizedProjectName = decodeRouteParam(projectName)

	return projects.find((project) => getProjectSlug(project) === normalizedProjectName) ?? null
}

export function readSelectedProjectId() {
	if (typeof window === 'undefined') {
		return null
	}

	const rawValue = window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY)
	const projectId = Number(rawValue)

	return Number.isInteger(projectId) && projectId > 0 ? projectId : null
}

export function setSelectedProjectId(projectId: number) {
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
				$meta?: { message?: string }
			}
		}).data

		return data?.$meta?.message ?? data?.statusMessage ?? data?.message ?? fallback
	}

	if (error instanceof Error) {
		return error.message
	}

	return fallback
}

function decodeRouteParam(value: string) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}
