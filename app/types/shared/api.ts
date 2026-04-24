export type ApiStatus = 'success' | 'error'

export type ApiResponse<T> = {
	$meta: {
		status: ApiStatus
		message?: string
	}
	data: T | null
}
