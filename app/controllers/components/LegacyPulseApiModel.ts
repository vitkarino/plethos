import type {
	BPMChartData,
	BPMMeasurement,
	BPMNowMeasurement,
	LegacyPulseChartResponse,
} from '~/types/components/bpm-block'

export class LegacyPulseApiModel {
	private readonly url = 'http://127.0.0.1:4000/api/'

	public getCurrentMeasurement() {
		return $fetch<BPMNowMeasurement[]>(`${this.url}measurements/current`)
			.then((measurements) => {
				if (!Array.isArray(measurements) || measurements.length === 0) {
					return null
				}

				return measurements[0]
			})
	}

	public getLatestMeasurement() {
		const fromDate = this.formatDateForLegacy(
			new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
		)

		return $fetch<BPMMeasurement[]>(
			`/py_cgi/puls/meassurements?from=${encodeURIComponent(fromDate)}`,
		).then((measurements) => {
			if (!Array.isArray(measurements) || measurements.length === 0) {
				return null
			}

			return measurements[0]
		})
	}

	public getChart(params: {
		id: string
		from: number
		to: number
		channels: number
		type: number
	}): Promise<{ chartData: BPMChartData; bpm: number | null }> {
		const query = new URLSearchParams({
			id: params.id,
			from: String(params.from),
			to: String(params.to),
			channels: String(params.channels),
			type: String(params.type),
		})

		return $fetch<LegacyPulseChartResponse>(
			`/py_cgi/puls/sensordata?${query.toString()}`,
		).then((response) => {
			return {
				chartData: {
					labels: Array.isArray(response.labels) ? response.labels : [],
					datasets: Array.isArray(response.datasets)
						? response.datasets
						: [],
				},
				bpm: typeof response.bpm === 'number' ? response.bpm : null,
			}
		})
	}

	private formatDateForLegacy(date: Date) {
		const dd = String(date.getDate()).padStart(2, '0')
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const yyyy = String(date.getFullYear())

		return `${dd}.${mm}.${yyyy}`
	}
}
