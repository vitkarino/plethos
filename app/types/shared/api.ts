export type ApiStatus = 'success' | 'error'

export type ApiError = {
	http_status: number
	code: string
	message: string
}

export type ApiSuccessMeta = {
	timestamp: string
	status: 'success'
}

export type ApiErrorMeta = {
	timestamp: string
	status: 'error'
	error: ApiError
}

export type ApiResponse<T> = {
	$meta: ApiSuccessMeta | ApiErrorMeta
	data: T | null
}
