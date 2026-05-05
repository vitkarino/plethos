import type { EntityId, QualityLevel, QualityReason, RecordingSample } from '~/types/shared/entities'

export type MeasurementStreamMetrics = {
	bpm: number | null
	spo2: number | null
	ratio: number | null
	signal_readiness?: {
		level: QualityLevel
		score: number
		is_recording_ready: boolean
		reason: QualityReason
	}
}

export type MeasurementUpdateMessage = {
	type: 'measurement_update'
	measurement_id: EntityId
	device_id: EntityId
	active_recording_id: EntityId | null
	timestamp: string
	sample_rate_hz: number
	sensor_temp_c: number
	samples: RecordingSample[]
	metrics: MeasurementStreamMetrics
}

export type RecordingStartedMessage = {
	type: 'recording_started'
	measurement_id: EntityId
	recording_id: EntityId
	sample_range: {
		start_index: number
		end_index: number | null
	}
	timestamp: string
}

export type RecordingStoppedMessage = {
	type: 'recording_stopped'
	measurement_id: EntityId
	recording_id: EntityId
	sample_range: {
		start_index: number
		end_index: number
	}
	samples_count: number
	timestamp: string
}

export type MeasurementFinishedMessage = {
	type: 'measurement_finished'
	measurement_id: EntityId
	status: 'completed' | 'failed' | 'cancelled'
	timestamp: string
}

export type MeasurementStreamMessage =
	| MeasurementUpdateMessage
	| RecordingStartedMessage
	| RecordingStoppedMessage
	| MeasurementFinishedMessage

export type MeasurementStreamHandlers = {
	onMessage: (message: MeasurementStreamMessage) => void
	onError: (message: string) => void
}

export class PulsoMeasurementStreamModel {
	private connection: WebSocket | null = null
	private readonly wsBaseUrl: string

	public constructor(wsBaseUrl?: string) {
		this.wsBaseUrl = wsBaseUrl ?? this.readWsBaseUrl()
	}

	public connect(measurementId: EntityId, handlers: MeasurementStreamHandlers) {
		this.disconnect()

		if (typeof WebSocket === 'undefined') {
			handlers.onError('WebSocket недоступний у цьому середовищі')
			return
		}

		const connection = new WebSocket(this.createStreamUrl(measurementId))
		this.connection = connection

		connection.onmessage = (event) => {
			this.parseMessage(event.data, handlers)
		}

		connection.onerror = () => {
			handlers.onError('Помилка WebSocket live stream')
		}

		connection.onclose = () => {
			if (this.connection === connection) {
				this.connection = null
			}
		}
	}

	public disconnect() {
		if (!this.connection) {
			return
		}

		this.connection.close()
		this.connection = null
	}

	private parseMessage(rawMessage: unknown, handlers: MeasurementStreamHandlers) {
		if (typeof rawMessage !== 'string') {
			handlers.onError('Некоректне WebSocket повідомлення')
			return
		}

		try {
			const parsedMessage = JSON.parse(rawMessage) as MeasurementStreamMessage
			handlers.onMessage(parsedMessage)
		} catch {
			handlers.onError('WebSocket повідомлення не є JSON')
		}
	}

	private createStreamUrl(measurementId: EntityId) {
		const normalizedBase = this.wsBaseUrl.replace(/\/+$/g, '')

		return `${normalizedBase}/ws/measurements/${encodeURIComponent(measurementId)}/stream`
	}

	private readWsBaseUrl() {
		const config = useRuntimeConfig()

		return config.public.pulsoWsBaseUrl || 'ws://127.0.0.1:8080'
	}
}
