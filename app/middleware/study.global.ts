import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { Study } from '~/types/shared/entities'
import {
	clearSelectedStudyId,
	findStudyByRouteName,
	getStudyRoutePath,
	readSelectedStudyId,
	setSelectedStudyId,
} from '~/utils/shared'

const legacyStudylessWorkRoutes = new Set([
	'/dashboard',
	'/ai',
	'/records',
])

export default defineNuxtRouteMiddleware((to) => {
	if (import.meta.server) {
		return
	}

	const path = normalizePath(to.path)

	const api = new PulsoApiModel()

	return api.fetchStudies()
		.then((studies) => resolveStudyRoute(to, path, studies))
		.catch(() => undefined)
})

function resolveStudyRoute(to: { params: Record<string, unknown>, query?: Record<string, unknown> }, path: string, studies: Study[]) {
	if (studies.length === 0) {
		clearSelectedStudyId()

		return path === '/' ? undefined : navigateTo('/', { replace: true })
	}

	const routeStudyName = getRouteStudyName(to.params.name)
	const routeStudy = routeStudyName ? findStudyByRouteName(studies, routeStudyName) : null

	if (routeStudy) {
		setSelectedStudyId(routeStudy.id)

		if (path.startsWith('/study/')) {
			return
		}

		if (path.startsWith('/p/')) {
			return navigateTo(studyDashboardLocation(routeStudy, to.query), { replace: true })
		}

		return
	}

	const selectedStudy = getSelectedStudy(studies)

	if (!selectedStudy) {
		clearSelectedStudyId()

		return path === '/' ? undefined : navigateTo('/', { replace: true })
	}

	if (path === '/') {
		return navigateTo(studyDashboardLocation(selectedStudy, to.query), { replace: true })
	}

	if (legacyStudylessWorkRoutes.has(path)) {
		return navigateTo(studyDashboardLocation(selectedStudy, to.query), { replace: true })
	}

	if (path.startsWith('/p/')) {
		return navigateTo(studyDashboardLocation(selectedStudy, to.query), { replace: true })
	}
}

function normalizePath(path: string) {
	return path.replace(/\/+$/, '') || '/'
}

function getRouteStudyName(value: unknown) {
	if (Array.isArray(value)) {
		return value[0] ?? ''
	}

	return typeof value === 'string' ? value : ''
}

function getSelectedStudy(studies: Study[]) {
	const selectedStudyId = readSelectedStudyId()

	return studies.find((study) => study.id === selectedStudyId) ?? null
}

function studyDashboardLocation(study: Study, query: Record<string, unknown> = {}) {
	return {
		path: getStudyRoutePath(study),
		query,
	}
}
