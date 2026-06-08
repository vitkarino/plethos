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
	Study,
	StudyParticipant,
	QualityAnalysis,
	Recording,
	RecordingSample,
	Participant,
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

export type StudyPayload = Pick<Study, 'title' | 'description'>

export type ParticipantPayload = {
	name: string
	age: number
	sex: Participant['sex']
}

export type StudyParticipantPayload = Pick<StudyParticipant, 'study_id' | 'participant_id'>

export type DeviceListQuery = ListQuery & {
	connection_status?: DeviceConnectionStatus
}

export type MeasurementListQuery = ListQuery & DateRangeQuery & {
	device_id?: EntityId
	participant_id?: EntityId
	study_id?: EntityId
	status?: EntityStatus
}

export type RecordingListQuery = MeasurementListQuery

export type RecordingSamplesQuery = {
	limit?: number
	offset?: number
}

export type StartMeasurementPayload = {
	device_id: EntityId
	participant_id: EntityId
	study_id: EntityId
}

export type StartRecordingPayload = {
	duration_s: number
	name?: string
	use_for_ml_training?: boolean
}

export type StudyParticipantDeleteResult = Pick<StudyParticipant, 'study_id' | 'participant_id'> & {
	deleted: boolean
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
					participant_id: payload.participant_id,
					study_id: payload.study_id,
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

	public getRecordingsExportUrl(query: RecordingListQuery = {}, format: 'csv' = 'csv') {
		return this.absoluteUrl(this.withQuery('/recordings/export', {
			...query,
			format,
		}))
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

	public sendAssistantMessage(
		recordingId: EntityId,
		message: string,
		conversationHistory: Array<{ role: 'user' | 'assistant'; message: string }> = [],
	) {
		return this.request<ApiEnvelope<ApiWrappedItem<'assistant', AssistantMessage> | AssistantMessage>>('/assistant/chat', {
			method: 'POST',
			body: {
				recording_id: recordingId,
				message,
				conversation_history: conversationHistory,
			},
		}).then((response) => this.readItem(response, 'assistant', 'Асистент не відповів'))
	}

	public fetchStudies(query: ListQuery = {}) {
		return this.getCollection<'studies', Study>('/studies', 'studies', query, 'Дослідження не завантажено')
	}

	public fetchStudy(studyId: EntityId) {
		return this.getItem<'study', Study>(
			`/studies/${encodeURIComponent(studyId)}`,
			'study',
			'Дослідження не завантажено',
		)
	}

	public createStudy(payload: StudyPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'study', Study> | Study>>('/studies', {
			method: 'POST',
			body: payload,
		}).then((response) => this.readItem(response, 'study', 'Дослідження не створено'))
	}

	public updateStudy(studyId: EntityId, payload: Partial<StudyPayload>) {
		return this.request<ApiEnvelope<ApiWrappedItem<'study', Study> | Study>>(
			`/studies/${encodeURIComponent(studyId)}`,
			{
				method: 'PATCH',
				body: payload,
			},
		).then((response) => this.readItem(response, 'study', 'Дослідження не збережено'))
	}

	public deleteStudy(studyId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'study', Study> | Study>>(
			`/studies/${encodeURIComponent(studyId)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'study', 'Дослідження не видалено'))
	}

	public fetchParticipants(query: ListQuery & { study_id?: EntityId } = {}) {
		return this.getCollection<'participants', Participant>('/participants', 'participants', query, 'Учасників не завантажено')
	}

	public fetchParticipant(participantId: EntityId) {
		return this.getItem<'participant', Participant>(
			`/participants/${encodeURIComponent(participantId)}`,
			'participant',
			'Учасника не завантажено',
		)
	}

	public createParticipant(payload: ParticipantPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'participant', Participant> | Participant>>('/participants', {
			method: 'POST',
			body: payload,
		}).then((response) => this.readItem(response, 'participant', 'Учасника не створено'))
	}

	public updateParticipant(participantId: EntityId, payload: Partial<ParticipantPayload>) {
		return this.request<ApiEnvelope<ApiWrappedItem<'participant', Participant> | Participant>>(
			`/participants/${encodeURIComponent(participantId)}`,
			{
				method: 'PATCH',
				body: payload,
			},
		).then((response) => this.readItem(response, 'participant', 'Учасника не збережено'))
	}

	public deleteParticipant(participantId: EntityId) {
		return this.request<ApiEnvelope<ApiWrappedItem<'participant', Participant> | Participant>>(
			`/participants/${encodeURIComponent(participantId)}`,
			{
				method: 'DELETE',
			},
		).then((response) => this.readItem(response, 'participant', 'Учасника не видалено'))
	}

	public assignParticipant(payload: StudyParticipantPayload) {
		return this.request<ApiEnvelope<ApiWrappedItem<'assignment', StudyParticipant> | StudyParticipant>>(
			`/studies/${encodeURIComponent(payload.study_id)}/participants`,
			{
				method: 'POST',
				body: {
					participant_id: payload.participant_id,
				},
			},
		).then((response) => this.readItem(response, 'assignment', 'Учасника не призначено'))
	}

	public unassignParticipant(payload: StudyParticipantPayload) {
		return this.request<ApiEnvelope<StudyParticipantDeleteResult>>(
			`/studies/${encodeURIComponent(payload.study_id)}/participants/${encodeURIComponent(payload.participant_id)}`,
			{
				method: 'DELETE',
			},
		).then((response) => readApiResponseData(response, 'Учасника не прибрано з дослідження'))
	}

	public fetchStudyParticipants() {
		return this.fetchStudies({
			limit: 1000,
		}).then((studies) => {
			return Promise.all(studies.map((study) => {
				return this.fetchParticipants({
					study_id: study.id,
					limit: 1000,
				}).then((participants) => {
					return participants.map((participant) => {
						return {
							study_id: study.id,
							participant_id: participant.id,
							assigned_at: participant.created_at,
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
