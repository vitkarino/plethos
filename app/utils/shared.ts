import type { Sex } from '~/types/shared/entities'

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
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
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
