export type ApiStatus = 'success' | 'error'

export type ApiTime = {
	human: string
	ts: number
}

export type ApiError = {
	code: string
	message: string
}

export type ApiSuccessMeta = {
	time: ApiTime
	status: 'success'
}

export type ApiErrorMeta = {
	time: ApiTime
	status: 'error'
	error: ApiError
}

export type ApiResponse<T> = {
	$meta: ApiSuccessMeta | ApiErrorMeta
	data: T | null
}
