import type { Device, EntityId, QualityAnalysis, Recording, User } from '../shared/entities'

export type BPMBlockStatus = 'idle' | 'measuring' | 'recording' | 'ready' | 'failed'

export type PulseSample = {
	id?: number
	recording_id: string
	sample_index: number
	raw_data: {
		r: number
		ir: number
	}
	created_at: string
}

export type PulseSampleChannel = 'r' | 'ir'

export type BPMChartDataset = {
	label: string
	data: Array<number | PulseSample>
	sampleChannel?: PulseSampleChannel
	parsing?: {
		xAxisKey: string
		yAxisKey: string
	}
	yAxisID?: string
	borderColor?: string
	backgroundColor?: string
	fill?: boolean
	pointRadius?: number
	pointHoverRadius?: number
	showLine?: boolean
}

export type BPMChartData = {
	labels?: number[]
	datasets: BPMChartDataset[]
}

export type BPMRecordingMarker = {
	recordingId: string
	startSampleIndex: number | null
	endSampleIndex: number | null
}

export type BPMMetricHistory = {
	bpm: number[]
	spo2: number[]
	signalReadiness: number[]
}

export type BPMMetricBaseline = {
	bpm: number | null
	spo2: number | null
	signalReadiness: number | null
}

export type BPMBlockState = {
	status: BPMBlockStatus
	progress: number
	measurementId: string | null
	recordingId: string | null
	projectId: EntityId | null
	selectedDeviceId: EntityId | null
	selectedUserId: EntityId | null
	devices: Device[]
	users: User[]
	recordings: Recording[]
	isLoading: boolean
	isActionRunning: boolean
	sampleRateHz: number | null
	sensorTempC: number | null
	bpm: number | null
	spo2: number | null
	signalReadiness: number | null
	metricHistory: BPMMetricHistory
	metricBaseline: BPMMetricBaseline
	qualityAnalysis: QualityAnalysis | null
	recordingMarkers: BPMRecordingMarker[]
	chartData: BPMChartData | null
	error: string | null
}
