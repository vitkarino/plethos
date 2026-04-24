// types/BPMBlock.ts
export type BPMBlockStatus = 'idle' | 'recording' | 'ready' | 'failed'

export interface BPMChartDataset {
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

export interface BPMChartData {
	labels: number[]
	datasets: BPMChartDataset[]
}

export interface BPMMeasurement {
	id: string
	tstmp?: string
	fname?: string
	risk?: string
	riskid?: string
	p_from?: string
	p_to?: string
}

export interface BPMNowMeasurement {
	id: string
	part: string | number
	parts: string | number
	t_start?: string
	t_finish?: string
}

export interface BPMBlockState {
	status: BPMBlockStatus
	progress: number
	measurementId: string | null
	bpm: number | null
	chartData: BPMChartData | null
	error: string | null
}