// components/BPMBlock/service/LegacyPulseApiAdapter.ts
export interface LegacyPulseChartResponse {
	labels: number[]
	datasets: Array<Record<string, unknown> & { label: string; data: number[] }>
	bpm?: number
}

export class LegacyPulseApiAdapter {

	private url = 'http://127.0.0.1:4000/api/'

	async getNowMeasurement(): Promise<any[]> {
		return await $fetch(`${this.url}measurements/current`)
	}

	async getMeasurements(fromDate: string): Promise<any[]> {
		return await $fetch(`/py_cgi/puls/meassurements?from=${encodeURIComponent(fromDate)}`)
	}

	async getSensorData(params: {
		id: string
		from: number
		to: number
		channels: number
		type: number
	}): Promise<LegacyPulseChartResponse> {
		const query = new URLSearchParams({
			id: params.id,
			from: String(params.from),
			to: String(params.to),
			channels: String(params.channels),
			type: String(params.type),
		})

		return await $fetch(`/py_cgi/puls/sensordata?${query.toString()}`)
	}
}