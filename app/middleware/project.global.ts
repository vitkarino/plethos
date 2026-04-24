import type { Project } from '~/types/shared/entities'
import {
	clearSelectedProjectId,
	findProjectByRouteName,
	getProjectRoutePath,
	readSelectedProjectId,
	setSelectedProjectId,
} from '~/utils/shared'

const projectlessWorkRoutes = new Set([
	'/dashboard',
	'/users',
	'/ai',
])

export default defineNuxtRouteMiddleware(async (to) => {
	if (import.meta.server) {
		return
	}

	const path = normalizePath(to.path)

	if (path === '/projects') {
		return
	}

	const projects = await $fetch<Project[]>('/api/projects').catch(() => null)

	if (!projects) {
		return
	}

	if (projects.length === 0) {
		clearSelectedProjectId()

		return navigateTo('/projects', { replace: true })
	}

	const routeProjectName = getRouteProjectName(to.params.name)
	const routeProject = routeProjectName ? findProjectByRouteName(projects, routeProjectName) : null

	if (routeProject) {
		setSelectedProjectId(routeProject.id)

		if (path.startsWith('/project/')) {
			return navigateTo(getProjectRoutePath(routeProject, '/dashboard'), { replace: true })
		}

		return
	}

	const selectedProject = getSelectedProject(projects)

	if (!selectedProject) {
		clearSelectedProjectId()

		return navigateTo('/projects', { replace: true })
	}

	if (path === '/') {
		return navigateTo(getProjectRoutePath(selectedProject, '/dashboard'), { replace: true })
	}

	if (projectlessWorkRoutes.has(path)) {
		return navigateTo(getProjectRoutePath(selectedProject, path), { replace: true })
	}

	if (path.startsWith('/p/')) {
		return navigateTo(getProjectRoutePath(selectedProject, getSectionPath(path)), { replace: true })
	}
})

function normalizePath(path: string) {
	return path.replace(/\/+$/, '') || '/'
}

function getRouteProjectName(value: unknown) {
	if (Array.isArray(value)) {
		return value[0] ?? ''
	}

	return typeof value === 'string' ? value : ''
}

function getSelectedProject(projects: Project[]) {
	const selectedProjectId = readSelectedProjectId()

	return projects.find((project) => project.id === selectedProjectId) ?? null
}

function getSectionPath(path: string) {
	const [, , , ...sectionParts] = path.split('/')

	return sectionParts.length > 0 ? `/${sectionParts.join('/')}` : '/dashboard'
}
