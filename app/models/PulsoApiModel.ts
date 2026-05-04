import type { ApiResponse } from '~/types/shared/api'
import type {
	ApiRecord,
	AssistantMessage,
	AssistantStatus,
	Device,
	DeviceConnectionStatus,
	EntityId,
	EntityStatus,
	HealthStatus,
	Measurement,
	Project,
	ProjectUser,
	QualityAnalysis,
	Recording,
	RecordingSample,
	User,
} from '~/types/shared/entities'
import { readApiResponseData } from '~/utils/shared'

type ApiEnvelope<T> = ApiResponse<T>
type ApiWrappedRecord<K extends string, T> = Record<K, ApiRecord<T> | T[]>
type ApiWrappedItem<K extends string, T> = Record<K, T>

export type ListQuery = {
	limit?: number
	offset?: number
}

export type DateRangeQuery = {
	date_from?: string
	date_to?: string
}

export type ProjectPayload = Pick<Project, 'title' | 'description'>

export type UserPayload = {
	name: string
	age: number
	sex: User['sex']
}

export type ProjectUserPayload = Pick<ProjectUser, 'project_id' | 'user_id'>

export type DeviceListQuery = ListQuery & {
	connection_status?: DeviceConnectionStatus
}

export type MeasurementListQuery = ListQuery & DateRangeQuery & {
	device_id?: EntityId
	user_id?: EntityId
	project_id?: EntityId
	status?: EntityStatus
}

export type RecordingListQuery = MeasurementListQuery

export type RecordingSamplesQuery = {
	limit?: number
	offset?: number
}

export type StartMeasurementPayload = {
	device_id: EntityId
	user_id: EntityId
	project_id: EntityId
}

export type StartRecordingPayload = {
	duration_s: number
}

export class PulsoApiModel {
	private readonly apiBaseUrl: string

	public constructor(apiBaseUrl?: string) {
		this.apiBaseUrl = apiBaseUrl ?? this.readApiBaseUrl()
	}

	public fetchHealth() {
		return this.getPlainOrWrapped<HealthStatus>('/health', 'Стан API не завантажено')
	}

	public fetchDevices(query: DeviceListQuery = {}) {
		return this.getCollection<'devices', Device>('/devices', 'devices', query, 'Пристрої не завантажено')
	}

	public fetchDeviceMetrics(deviceId: EntityId) {
		return this.getItem<'metrics', Partial<Measurement>>(
			`/devices/${encodeURIComponent(deviceId)}/metrics`,
			'metrics',
			'Метрики пристрою не завантажено',
		)
	}

	public deleteDevice(deviceId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'device', Device> | Device>>(
			`/devices/${encodeURIComponent(deviceId)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'device', 'Пристрій не видалено'))
	}

	public startMeasurement(payload: StartMeasurementPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'measurement', Measurement> | Measurement>>(
			`/devices/${encodeURIComponent(payload.device_id)}/measurements`,
			{
				method: 'POST',
				body: {
					user_id: payload.user_id,
					project_id: payload.project_id,
				},
			},
		).then((response) => this.readItem(response, 'measurement', 'Вимірювання не стартувало'))
	}

	public stopMeasurement(measurementId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'measurement', Measurement> | Measurement>>(
			`/measurements/${encodeURIComponent(measurementId)}/stop`,
			{
				method: 'POST',
			},
		).then((response) => this.readItem(response, 'measurement', 'Вимірювання не зупинено'))
	}

	public fetchMeasurements(query: MeasurementListQuery = {}) {
		return this.getCollection<'measurements', Measurement>('/measurements', 'measurements', query, 'Вимірювання не завантажено')
	}

	public fetchMeasurement(measurementId: EntityId) {
		return this.getItem<'measurement', Measurement>(
			`/measurements/${encodeURIComponent(measurementId)}`,
			'measurement',
			'Вимірювання не завантажено',
		)
	}

	public startRecording(measurementId: EntityId, payload: StartRecordingPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'recording', Recording> | Recording>>(
			`/measurements/${encodeURIComponent(measurementId)}/recording`,
			{
				method: 'POST',
				body: payload,
			},
		).then((response) => this.readItem(response, 'recording', 'Запис не стартував'))
	}

	public stopRecording(measurementId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'recording', Recording> | Recording>>(
			`/measurements/${encodeURIComponent(measurementId)}/recording/stop`,
			{
				method: 'POST',
			},
		).then((response) => this.readItem(response, 'recording', 'Запис не зупинено'))
	}

	public fetchRecordings(query: RecordingListQuery = {}) {
		return this.getCollection<'recordings', Recording>('/recordings', 'recordings', query, 'Записи не завантажено')
	}

	public fetchRecording(recordingId: EntityId) {
		return this.getItem<'recording', Recording>(
			`/recordings/${encodeURIComponent(recordingId)}`,
			'recording',
			'Запис не завантажено',
		)
	}

	public deleteRecording(recordingId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'recording', Recording> | Recording>>(
			`/recordings/${encodeURIComponent(recordingId)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'recording', 'Запис не видалено'))
	}

	public fetchRecordingSamples(recordingId: EntityId, query: RecordingSamplesQuery = {}) {
		return this.request<ApiEnvelope<ApiWrappedRecord<'samples', RecordingSample> | { samples: RecordingSample[] }>>(
			this.withQuery(`/recordings/${encodeURIComponent(recordingId)}/samples`, query),
		).then((response) => {
			const data = readApiResponseData(response, 'Зразки запису не завантажено')

			if ('samples' in data) {
				return this.toArray(data.samples)
			}

			return []
		})
	}

	public getRecordingExportUrl(recordingId: EntityId, format: 'csv' | 'json') {
		return this.absoluteUrl(`/recordings/${encodeURIComponent(recordingId)}/export?format=${encodeURIComponent(format)}`)
	}

	public runQualityAnalysis(recordingId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'quality_analysis', QualityAnalysis> | QualityAnalysis>>(
			`/recordings/${encodeURIComponent(recordingId)}/quality-analysis`,
			{
				method: 'POST',
			},
		).then((response) => this.readItem(response, 'quality_analysis', 'Аналіз якості не запущено'))
	}

	public fetchQualityAnalysis(recordingId: EntityId) {
		return this.getItem<'quality_analysis', QualityAnalysis>(
			`/recordings/${encodeURIComponent(recordingId)}/quality-analysis`,
			'quality_analysis',
			'Аналіз якості не завантажено',
		)
	}

	public fetchAssistantStatus() {
		return this.getItem<'assistant', AssistantStatus>('/assistant/status', 'assistant', 'Статус асистента не завантажено')
	}

	public sendAssistantMessage(recordingId: EntityId, message: string) {
		return this.request<ApiEnvelope<ApiWrappedItem<'assistant', AssistantMessage> | AssistantMessage>>('/assistant/chat', {
			method: 'POST',
			body: {
				recording_id: recordingId,
				message,
			},
		}).then((response) => this.readItem(response, 'assistant', 'Асистент не відповів'))
	}

	public fetchProjects(query: ListQuery = {}) {
		return this.getCollection<'projects', Project>('/projects', 'projects', query, 'Проєкти не завантажено')
	}

	public fetchProject(projectId: EntityId) {
		return this.getItem<'project', Project>(
			`/projects/${encodeURIComponent(projectId)}`,
			'project',
			'Проєкт не завантажено',
		)
	}

	public createProject(payload: ProjectPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'project', Project> | Project>>('/projects', {
			method: 'POST',
			body: payload,
		}).then((response) => this.readItem(response, 'project', 'Проєкт не створено'))
	}

	public updateProject(projectId: EntityId, payload: Partial<ProjectPayload>) {
		return this.request<ApiEnvelope<ApiWrappedItem<'project', Project> | Project>>(
			`/projects/${encodeURIComponent(projectId)}`,
			{
				method: 'PATCH',
				body: payload,
			},
		).then((response) => this.readItem(response, 'project', 'Проєкт не збережено'))
	}

	public deleteProject(projectId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'project', Project> | Project>>(
			`/projects/${encodeURIComponent(projectId)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'project', 'Проєкт не видалено'))
	}

	public fetchUsers(query: ListQuery & { project_id?: EntityId } = {}) {
		return this.getCollection<'users', User>('/users', 'users', query, 'Користувачів не завантажено')
	}

	public fetchUser(userId: EntityId) {
		return this.getItem<'user', User>(
			`/users/${encodeURIComponent(userId)}`,
			'user',
			'Користувача не завантажено',
		)
	}

	public createUser(payload: UserPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'user', User> | User>>('/users', {
			method: 'POST',
			body: payload,
		}).then((response) => this.readItem(response, 'user', 'Користувача не створено'))
	}

	public updateUser(userId: EntityId, payload: Partial<UserPayload>) {
		return this.request<ApiEnvelope<ApiWrappedItem<'user', User> | User>>(
			`/users/${encodeURIComponent(userId)}`,
			{
				method: 'PATCH',
				body: payload,
			},
		).then((response) => this.readItem(response, 'user', 'Користувача не збережено'))
	}

	public deleteUser(userId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'user', User> | User>>(
			`/users/${encodeURIComponent(userId)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'user', 'Користувача не видалено'))
	}

	public assignUser(payload: ProjectUserPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'project', Project> | Project>>(
			`/projects/${encodeURIComponent(payload.project_id)}/users`,
			{
				method: 'POST',
				body: {
					user_id: payload.user_id,
				},
			},
		).then((response) => this.readItem(response, 'project', 'Користувача не призначено'))
	}

	public unassignUser(payload: ProjectUserPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'project', Project> | Project>>(
			`/projects/${encodeURIComponent(payload.project_id)}/users/${encodeURIComponent(payload.user_id)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'project', 'Користувача не прибрано з проєкту'))
	}

	public fetchProjectUsers() {
		return this.fetchProjects({
			limit: 1000,
		}).then((projects) => {
			return Promise.all(projects.map((project) => {
				return this.fetchUsers({
					project_id: project.id,
					limit: 1000,
				}).then((users) => {
					return users.map((user) => {
						return {
							project_id: project.id,
							user_id: user.id,
							assigned_at: user.created_at,
						}
					})
				})
			}))
		}).then((assignmentGroups) => assignmentGroups.flat())
	}

	private getCollection<K extends string, T>(path: string, key: K, query: Record<string, unknown>, fallback: string) {
		return this.request<ApiEnvelope<ApiWrappedRecord<K, T> | T[]>>(this.withQuery(path, query))
			.then((response) => {
				const data = readApiResponseData(response, fallback)

				if (Array.isArray(data)) {
					return data
				}

				return this.toArray(data[key])
			})
	}

	private getItem<K extends string, T>(path: string, key: K, fallback: string) {
		return this.request<ApiEnvelope<ApiWrappedItem<K, T> | T>>(path)
			.then((response) => this.readItem(response, key, fallback))
	}

	private getPlainOrWrapped<T>(path: string, fallback: string) {
		return this.request<T | ApiEnvelope<T>>(path)
			.then((response) => {
				if (this.isApiEnvelope(response)) {
					return readApiResponseData(response, fallback)
				}

				return response
			})
	}

	private readItem<K extends string, T>(response: ApiEnvelope<ApiWrappedItem<K, T> | T>, key: K, fallback: string) {
		const data = readApiResponseData(response, fallback)

		if (this.isObject(data) && key in data) {
			return data[key] as T
		}

		return data as T
	}

	private request<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
		return $fetch<T>(this.absoluteUrl(path), options)
	}

	private absoluteUrl(path: string) {
		const normalizedBase = this.apiBaseUrl.replace(/\/+$/g, '')
		const normalizedPath = path.startsWith('/') ? path : `/${path}`

		return `${normalizedBase}${normalizedPath}`
	}

	private withQuery(path: string, query: Record<string, unknown>) {
		const params = new URLSearchParams()

		Object.entries(query).forEach(([key, value]) => {
			if (value === undefined || value === null || value === '') {
				return
			}

			params.set(key, String(value))
		})

		const queryString = params.toString()

		return queryString ? `${path}?${queryString}` : path
	}

	private toArray<T>(value: ApiRecord<T> | T[] | undefined) {
		if (Array.isArray(value)) {
			return value
		}

		if (this.isObject(value)) {
			return Object.values(value)
		}

		return []
	}

	private isApiEnvelope<T>(value: T | ApiEnvelope<T>): value is ApiEnvelope<T> {
		return this.isObject(value) && '$meta' in value && 'data' in value
	}

	private isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null
	}

	private readApiBaseUrl() {
		const config = useRuntimeConfig()

		return config.public.pulsoApiBaseUrl || 'http://127.0.0.1:8080/api'
	}
}
