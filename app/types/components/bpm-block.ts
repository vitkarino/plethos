export type BPMBlockStatus = 'idle' | 'recording' | 'ready' | 'failed'

export type BPMChartDataset = {
	label: string
	data: number[]
	yAxisID?: string
	borderColor?: string
	backgroundColor?: string
	fill?: boolean
	pointRadius?: number
	pointHoverRadius?: number
	showLine?: boolean
}

export type BPMChartData = {
	labels: number[]
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

export type BPMBlockState = {
	status: BPMBlockStatus
	progress: number
	measurementId: string | null
	bpm: number | null
	chartData: BPMChartData | null
	error: string | null
}
