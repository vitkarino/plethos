export type EntityId = string

export type Sex = 'male' | 'female' | 'other' | null

export type EntityStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export type DeviceStatus = 'idle' | 'measuring' | 'recording'

export type DeviceConnectionStatus = 'connected' | 'disconnected'

export type QualityLevel = 'high' | 'medium' | 'low'

export type QualityReason =
	| 'low_perfusion'
	| 'saturation'
	| 'flatline'
	| 'high_noise'
	| 'irregular_rhythm'
	| null

export type ApiRecord<T> = Record<string, T>

export type Participant = {
	id: EntityId
	name: string
	age: number
	sex: Sex
	studies_count?: number
	recordings_count?: number
	created_at: string
	updated_at?: string
}

export type Study = {
	id: EntityId
	title: string
	description: string
	participants_count?: number
	recordings_count?: number
	created_at: string
	updated_at?: string
}

export type StudyParticipant = {
	study_id: EntityId
	participant_id: EntityId
	assigned_at: string
}

export type AssignedParticipant = {
	participant: Participant
	assigned_at: string
}

export type Device = {
	id: EntityId
	is_simulated: boolean
	connection_status: DeviceConnectionStatus
	status: DeviceStatus
	active_measurement_id: EntityId | null
	active_recording_id: EntityId | null
}

export type MeasurementTime = {
	started_at: string
	finished_at: string | null
	duration_ms: number | null
}

export type Measurement = {
	id: EntityId
	is_simulated: boolean
	participant_id: EntityId
	study_id: EntityId
	active_recording_id: EntityId | null
	device_id: EntityId
	time: MeasurementTime
	status: EntityStatus
	channels: Array<'ir' | 'red'>
	sample_rate_hz: number
	sensor_temp_c: number
	bpm: number | null
	spo2: number | null
	ratio: number | null
}

export type Recording = {
	id: EntityId
	name: string
	measurement_id: EntityId
	study_id?: EntityId
	participant_id?: EntityId
	quality_analysis_id: EntityId | null
	use_for_ml_training: boolean
	status: EntityStatus
	time: MeasurementTime
	sample_range: {
		start_index: number
		end_index: number | null
	}
	samples_count: number | null
}

export type RecordingSample = {
	index: number
	t_ms?: number
	ir: number
	red: number
	ir_filtered?: number
	red_filtered?: number
}

export type QualityAnalysis = {
	id: EntityId
	recording_id: EntityId
	timestamp: string
	model: {
		type: string
		name: string
		version: string
	}
	quality_result: {
		level: QualityLevel
		score: number
		reason: QualityReason
	}
	features: Record<string, number>
}

export type AssistantStatus = {
	enabled: boolean
	provider: string
	base_url: string
	model: string
}

export type AssistantMessage = {
	recording_id: EntityId
	quality_analysis_id: EntityId | null
	timestamp: string
	provider: {
		type: string
		model: string
	}
	message: string
}

export type HealthStatus = {
	status: 'ok' | 'degraded' | 'down'
	timestamp: string
	services: Record<string, 'ok' | 'connected' | 'disconnected' | 'unavailable'>
}
