import { reactive } from 'vue'
import { LegacyPulseApiModel } from '~/controllers/components/LegacyPulseApiModel'
import type { BPMBlockState, BPMMeasurement, BPMNowMeasurement } from '~/types/components/bpm-block'

export class BPMBlockViewModel {
	public readonly state = reactive<BPMBlockState>({
		status: 'idle',
		progress: 0,
		measurementId: null,
		bpm: null,
		chartData: null,
		error: null,
	})

	private readonly model = new LegacyPulseApiModel()
	private pollTimer: ReturnType<typeof setInterval> | null = null
	private lastLoadedMeasurementId: string | null = null

	public initialize() {
		return this.loadLatestFinishedMeasurement()
			.catch((error) => {
				this.handleError(error, 'Unknown BPM initialization error')
			})
	}

	public startMeasurement() {
		this.state.error = null
		this.state.status = 'recording'
		this.startPolling()
	}

	public destroy() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	private startPolling() {
		this.destroy()
		this.pollCurrentMeasurement()
		this.pollTimer = setInterval(() => {
			this.pollCurrentMeasurement()
		}, 3000)
	}

	private pollCurrentMeasurement() {
		return this.model.getCurrentMeasurement()
			.then((currentMeasurement) => {
				if (!currentMeasurement) {
					if (this.state.status === 'recording' && this.state.measurementId) {
						return this.loadLatestFinishedMeasurement().then(() => {
							this.state.progress = 0
						})
					}

					return null
				}

				return this.syncCurrentMeasurement(currentMeasurement)
			})
			.catch((error) => {
				this.handleError(error, 'Unknown BPM polling error')
			})
	}

	public loadLatestFinishedMeasurement() {
		return this.model.getLatestMeasurement()
			.then((measurement) => {
				if (!measurement?.id) {
					return
				}

				if (this.lastLoadedMeasurementId === measurement.id && this.state.chartData) {
					this.state.status = 'ready'
					return
				}

				return this.loadMeasurementChart(measurement)
			})
			.catch((error) => {
				this.handleError(error, 'Unknown BPM chart error')
			})
	}

	private syncCurrentMeasurement(currentMeasurement: BPMNowMeasurement) {
		const part = Number(currentMeasurement.part ?? 0)
		const parts = Number(currentMeasurement.parts ?? 0)
		const isFinished = Boolean(currentMeasurement.t_finish)

		this.state.measurementId = String(currentMeasurement.id ?? '')
		this.state.progress = parts > 0 ? ((part + 1) / parts) * 100 : 0
		this.state.status = isFinished ? 'ready' : 'recording'
		this.state.error = null

		if (!isFinished) {
			return null
		}

		return this.loadLatestFinishedMeasurement().then(() => {
			this.state.progress = 0
		})
	}

	private loadMeasurementChart(measurement: BPMMeasurement) {
		this.state.measurementId = measurement.id

		const from = Number(measurement.p_from ?? 0)
		const to = Number(measurement.p_to ?? 100)

		return this.model.getChart({
			id: measurement.id,
			from: Number.isFinite(from) ? from : 0,
			to: Number.isFinite(to) && to > 0 ? to : 100,
			channels: 1,
			type: 5,
		}).then((result) => {
			this.state.chartData = result.chartData
			this.state.bpm = result.bpm
			this.state.status = 'ready'
			this.state.error = null
			this.lastLoadedMeasurementId = measurement.id
		})
	}

	private handleError(error: unknown, fallbackMessage: string) {
		this.state.status = 'failed'
		this.state.error = error instanceof Error ? error.message : fallbackMessage
	}
}
