import type { BPMChartData, BPMMeasurement } from '../types/BPMBlock'
import { LegacyPulseApiAdapter } from './LegacyPulseApiAdapter'

export class BPMBlockController {
	private readonly api: LegacyPulseApiAdapter

	public constructor() {
		this.api = new LegacyPulseApiAdapter()
	}


	public loadCurrentMeasurements() {
		return this.api.getNowMeasurement()
			.then((now) => {
				if (!Array.isArray(now) || now.length === 0) {
					return null
				}

				const item = now[0]
				const part = Number(item.part ?? 0)
				const parts = Number(item.parts ?? 0)

				return {
					measurementId: String(item.id ?? ''),
					status: 'recording',
					progress: parts > 0 ? ((part + 1) / parts) * 100 : 0,
					error: null,
				}
			})
			.catch(() => {
				return null
			})
	}

	public loadLatestMeasurement() {
		const fromDate = this.formatDateForLegacy(
			new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
		)

		return this.api.getMeasurements(fromDate)
			.then((measurements) => {
				if (!Array.isArray(measurements) || measurements.length === 0) {
					return null
				}

				return measurements[0] as BPMMeasurement
			})
			.catch(() => {
				return null
			})
	}

	public loadChart(params: {
		id: string
		from: number
		to: number
		channels: number
		type: number
	}): Promise<{ chartData: BPMChartData; bpm: number | null }> {
		return this.api.getSensorData(params)
			.then((response) => {
				return {
					chartData: {
						labels: Array.isArray(response.labels) ? response.labels : [],
						datasets: Array.isArray(response.datasets)
							? (response.datasets as any)
							: [],
					},
					bpm: typeof response.bpm === 'number' ? response.bpm : null,
				}
			})
			.catch(() => {
				return {
					chartData: {
						labels: [],
						datasets: [],
					},
					bpm: null,
				}
			})
	}

	private formatDateForLegacy(date: Date): string {
		const dd = String(date.getDate()).padStart(2, '0')
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const yyyy = String(date.getFullYear())

		return `${dd}.${mm}.${yyyy}`
	}
}