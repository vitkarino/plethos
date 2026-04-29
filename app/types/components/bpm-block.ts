export type BPMBlockStatus = 'idle' | 'recording' | 'ready' | 'failed'

export type PulseSample = {
	id: number
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

export type BPMMeasurement = {
	id: string
	tstmp?: string
	fname?: string
	risk?: string
	riskid?: string
	p_from?: string
	p_to?: string
}

export type BPMNowMeasurement = {
	id: string
	part: string | number
	parts: string | number
	t_start?: string
	t_finish?: string
}

export type LegacyPulseChartResponse = {
	labels: number[]
	datasets: Array<Record<string, unknown> & { label: string; data: number[] }>
	bpm?: number
}

export type PulseSamplesResponse = {
	data: {
		measurement_id: string
		samples: PulseSample[]
		limit: number
		offset: number
	}
	$meta?: {
		status?: string
		time?: {
			iso?: string
		}
	}
}

export type BPMBlockState = {
	status: BPMBlockStatus
	progress: number
	measurementId: string | null
	bpm: number | null
	spo2: number | null
	signalQuality: number | null
	chartData: BPMChartData | null
	error: string | null
}
