export type ApiStatus = 'success' | 'error'

export type ApiTime = {
	human: string
	ts: number
}

export type ApiError = {
	http_status?: number
	code: string
	message: string
}

export type ApiSuccessMeta = {
	time?: ApiTime
	timestamp?: string
	status: 'success'
}

export type ApiErrorMeta = {
	time?: ApiTime
	timestamp?: string
	status: 'error'
	error: ApiError
}

export type ApiResponse<T> = {
	$meta: ApiSuccessMeta | ApiErrorMeta
	data: T | null
}
