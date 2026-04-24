import { reactive } from 'vue'
import type { BPMBlockState, BPMBlockStatus } from '../types/BPMBlock'
import { BPMBlockController } from './BPMBlockController'

export class BPMBlockUI {
	private readonly state = reactive<BPMBlockState>({
		status: 'idle',
		progress: 0,
		measurementId: null,
		bpm: null,
		chartData: null,
		error: null,
	})

	private controller: BPMBlockController
	private pollTimer: ReturnType<typeof setInterval> | null = null
	private lastLoadedMeasurementId: string | null = null

	public constructor() {
		this.controller = new BPMBlockController();
	}

	// public async init(): Promise<void> {
	// 	await this.loadLatestFinishedMeasurement()
	// 	this.startPolling()
	// }

	public startMeasurement() {
		// this.loadLatestFinishedMeasurement()
		this.startPolling()
	}

	public destroy(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	private startPolling(): void {
		const wasRecording = this.state.status === 'recording'

		this.pollTimer = setInterval(() => {
			this.controller.loadCurrentMeasurements()
				.then((currentMeasurement) => {
					if (!currentMeasurement) {
						if (wasRecording && this.state.progress > 0) {
							this.state.progress = 100
							this.state.status = 'ready'
						}

						return null
					}

					this.state.measurementId = currentMeasurement.measurementId
					this.state.status = currentMeasurement.status as BPMBlockStatus
					this.state.progress = currentMeasurement.progress
					this.state.error = currentMeasurement.error

					const finished = wasRecording && currentMeasurement.status === 'ready'

					if (!finished) {
						return null
					}


					return this.loadLatestFinishedMeasurement()
						.then(() => {
							this.state.progress = 0
						})
				})
				.catch((error) => {
					this.state.status = 'failed'
					this.state.error = error instanceof Error
						? error.message
						: 'Unknown BPM polling error'
				})
		}, 3000)
	}

	public loadLatestFinishedMeasurement(): Promise<void> {
		return this.controller.loadLatestMeasurement()
			.then((measurement) => {
				if (!measurement?.id) {
					return
				}

				if (this.lastLoadedMeasurementId === measurement.id && this.state.chartData) {
					return
				}

				this.state.measurementId = measurement.id

				const pFrom = Number(measurement.p_from ?? 0)
				const pTo = Number(measurement.p_to ?? 100)

				return this.controller.loadChart({
					id: measurement.id,
					from: Number.isFinite(pFrom) ? pFrom : 0,
					to: Number.isFinite(pTo) && pTo > 0 ? pTo : 100,
					channels: 1,
					type: 5,
				}).then((result) => {
					this.state.chartData = result.chartData
					this.state.bpm = result.bpm
					this.state.status = 'ready'
					this.state.error = null
					this.lastLoadedMeasurementId = measurement.id
				})
			})
			.catch((error) => {
				this.state.status = 'failed'
				this.state.error = error instanceof Error
					? error.message
					: 'Unknown BPM chart error'
			})
	}

	get bpm() {
		return this.state.bpm;
	}

	get status() {
		return this.state.status
	}

	get progress() {
		return this.state.progress
	}

	get error() {
		return this.state.error
	}

	get chartData() {
		return this.state.chartData
	}
}