import type { ApiResponse } from '~/types/shared/api'
import type { EntityId, Study, StudyParticipant, Sex } from '~/types/shared/entities'

export const SELECTED_STUDY_STORAGE_KEY = 'pulso.selectedStudyId'

export type QualityTone = 'high' | 'medium' | 'low' | 'neutral'

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
})

export function formatDateValue(value: string) {
	const date = new Date(value)

	return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function formatDateTimeValue(value: string) {
	const date = new Date(value)

	return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date)
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

export function getParticipantInitials(name: string) {
	const initials = name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('')

	return initials || 'К'
}

export function getParticipantStudyTitles(studies: Study[], studyParticipants: StudyParticipant[], participantId: EntityId) {
	const studyIds = studyParticipants
		.filter((studyParticipant) => studyParticipant.participant_id === participantId)
		.map((studyParticipant) => studyParticipant.study_id)

	return studies
		.filter((study) => studyIds.includes(study.id))
		.map((study) => study.title)
}

export function toStudySlug(title: string) {
	return title
		.toLowerCase()
		.trim()
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
}

export function getStudySlug(study: Pick<Study, 'id' | 'title'>) {
	return toStudySlug(study.title) || `study-${study.id}`
}

export function getStudyRoutePath(study: Pick<Study, 'id' | 'title'>) {
	return `/study/${getStudySlug(study)}/dashboard`
}

export function getQualityTone(scorePercent: number | null | undefined): QualityTone {
	if (!Number.isFinite(scorePercent)) {
		return 'neutral'
	}

	if (Number(scorePercent) >= 80) {
		return 'high'
	}

	if (Number(scorePercent) >= 60) {
		return 'medium'
	}

	return 'low'
}

export function findStudyByRouteName(studies: Study[], studyName: string) {
	return studies.find((study) => getStudySlug(study) === studyName || String(study.id) === studyName) ?? null
}

export function readSelectedStudyId() {
	if (typeof window === 'undefined') {
		return null
	}

	const rawValue = window.localStorage.getItem(SELECTED_STUDY_STORAGE_KEY)

	return rawValue?.trim() || null
}

export function setSelectedStudyId(studyId: EntityId) {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(SELECTED_STUDY_STORAGE_KEY, String(studyId))
}

export function clearSelectedStudyId() {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.removeItem(SELECTED_STUDY_STORAGE_KEY)
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
