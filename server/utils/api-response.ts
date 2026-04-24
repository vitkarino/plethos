import type { ApiResponse } from '../../app/types/shared/api'

function createApiTime() {
	const date = new Date()

	return {
		human: date.toISOString(),
		ts: Math.floor(date.getTime() / 1000),
	}
}

export function createApiSuccessResponse<T>(data: T): ApiResponse<T> {
	return {
		$meta: {
			time: createApiTime(),
			status: 'success',
		},
		data,
	}
}

export function createApiErrorResponse(code: string, message: string): ApiResponse<null> {
	return {
		$meta: {
			time: createApiTime(),
			status: 'error',
			error: {
				code,
				message,
			},
		},
		data: null,
	}
}
