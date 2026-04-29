import { reactive } from 'vue'
import { LegacyPulseApiModel } from '~/controllers/components/LegacyPulseApiModel'
import { createChartDataFromPulseSamples } from '~/controllers/components/pulseSamplesChart'
import type { BPMBlockState, BPMChartData, BPMMeasurement, BPMNowMeasurement, PulseSample } from '~/types/components/bpm-block'

const PREVIEW_MEASUREMENT_ID = '0f561369-8df7-43f7-bda2-9bac4d04f477'
const PREVIEW_SAMPLE_COUNT = 370
const PREVIEW_FIRST_SAMPLE_ID = 6860
const PREVIEW_STARTED_AT = Date.parse('2026-04-26T15:00:48.234800Z')

export class BPMBlockViewModel {
	public readonly state = reactive<BPMBlockState>({
		status: 'ready',
		progress: 0,
		measurementId: PREVIEW_MEASUREMENT_ID,
		bpm: null,
		spo2: null,
		signalQuality: null,
		chartData: createPreviewChartData(),
		error: null,
	})

	private readonly model = new LegacyPulseApiModel()
	private pollTimer: ReturnType<typeof setInterval> | null = null
	private lastLoadedMeasurementId: string | null = null

	public initialize() {
		return this.loadLatestFinishedMeasurement()
			.catch((error) => {
				if (!this.state.chartData) {
					this.handleError(error, 'Невідома помилка ініціалізації BPM')
					return
				}

				this.state.status = 'ready'
				this.state.error = null
			})
	}

	public startMeasurement() {
		this.state.error = null
		this.state.spo2 = null
		this.state.signalQuality = null
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
						return this.loadMeasurementChart({
							id: this.state.measurementId,
							p_from: '0',
							p_to: '100',
						}).then(() => {
							this.state.progress = 0
						})
					}

					return null
				}

				return this.syncCurrentMeasurement(currentMeasurement)
			})
			.catch((error) => {
				this.handleError(error, 'Невідома помилка опитування BPM')
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
				this.handleError(error, 'Невідома помилка графіка BPM')
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

		return this.loadMeasurementChart({
			id: this.state.measurementId,
			p_from: '0',
			p_to: '100',
		}).then(() => {
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
			this.state.spo2 = this.getMockSpO2(measurement.id)
			this.state.signalQuality = this.getMockSignalQuality(measurement.id)
			this.state.status = 'ready'
			this.state.error = null
			this.lastLoadedMeasurementId = measurement.id
		})
	}

	private getMockSpO2(seed: string) {
		return 96 + (this.getSeedNumber(seed) % 4)
	}

	private getMockSignalQuality(seed: string) {
		return 82 + (this.getSeedNumber(seed) % 16)
	}

	private getSeedNumber(seed: string) {
		return seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
	}

	private handleError(error: unknown, fallbackMessage: string) {
		this.state.status = 'failed'
		this.state.error = error instanceof Error ? error.message : fallbackMessage
	}
}

function createPreviewChartData(): BPMChartData {
	return createChartDataFromPulseSamples(createPreviewPulseSamples())
}

function createPreviewPulseSamples(): PulseSample[] {
	return Array.from({ length: PREVIEW_SAMPLE_COUNT }, (_, sampleIndex) => {
		const cyclePosition = sampleIndex % 20
		const beatDrop = cyclePosition < 5 ? (5 - cyclePosition) * 120 : 0
		const rTrend = 129713 - sampleIndex * 6.1
		const irTrend = 174818 - sampleIndex * 1.3
		const rWave = Math.sin(sampleIndex / 8.5) * 95 + Math.sin(sampleIndex / 29) * 65
		const irWave = Math.sin(sampleIndex / 7.8) * 430 + Math.sin(sampleIndex / 33) * 220

		return {
			id: PREVIEW_FIRST_SAMPLE_ID + sampleIndex,
			recording_id: PREVIEW_MEASUREMENT_ID,
			sample_index: sampleIndex,
			raw_data: {
				r: Math.round(rTrend + rWave - beatDrop),
				ir: Math.round(irTrend + irWave - beatDrop * 3.2),
			},
			created_at: new Date(PREVIEW_STARTED_AT + sampleIndex * 40).toISOString(),
		}
	})
}
