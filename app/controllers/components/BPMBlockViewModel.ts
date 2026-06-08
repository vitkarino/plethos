import { reactive } from 'vue'
import { createChartDataFromRecordingSamples } from '~/controllers/components/pulseSamplesChart'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import { PulsoMeasurementStreamModel, type MeasurementStreamMessage } from '~/models/PulsoMeasurementStreamModel'
import type { BPMBlockState } from '~/types/components/bpm-block'
import type { EntityId, Measurement, QualityLevel, Recording, RecordingSample } from '~/types/shared/entities'
import { getRequestErrorMessage } from '~/utils/shared'

const RECORDING_SAMPLES_PAGE_SIZE = 1000
const RECORDINGS_LIST_LIMIT = 12
const BPM_BLOCK_STORAGE_KEY_PREFIX = 'pulso.bpmBlock'

type BPMBlockPersistedState = {
	measurementId: EntityId | null
	recordingId: EntityId | null
	selectedDeviceId: EntityId | null
	selectedParticipantId: EntityId | null
	useRecordingsForMlTraining: 'false' | 'true'
	sampleOriginIndex: number | null
}

type BPMBlockVisualSnapshot = {
	sampleRateHz: number | null
	sensorTempC: number | null
	bpm: number | null
	spo2: number | null
	signalReadiness: QualityLevel | null
}

type RecordingSampleRange = {
	recordingId: EntityId
	startIndex: number
	endIndex: number | null
}

export class BPMBlockViewModel {
	public readonly state = reactive<BPMBlockState>({
		status: 'ready',
		progress: 0,
		measurementId: null,
		recordingId: null,
		studyId: null,
		selectedDeviceId: null,
		selectedParticipantId: null,
		useRecordingsForMlTraining: 'false',
		devices: [],
		participants: [],
		recordings: [],
		isLoading: true,
		isActionRunning: false,
		sampleRateHz: null,
		sensorTempC: null,
		bpm: null,
		spo2: null,
		signalReadiness: null,
		qualityAnalysis: null,
		recordingMarkers: [],
		chartData: null,
		error: null,
	})

	private readonly api = new PulsoApiModel()
	private readonly stream = new PulsoMeasurementStreamModel()
	private liveSamples: RecordingSample[] = []
	private sampleOriginIndex: number | null = null
	private recordingSampleRanges: RecordingSampleRange[] = []
	private isStoppingMeasurement = false
	private lastVisualSnapshot: BPMBlockVisualSnapshot = {
		sampleRateHz: null,
		sensorTempC: null,
		bpm: null,
		spo2: null,
		signalReadiness: null,
	}

	private readonly options: { autoLoadLastRecording: boolean }

	public constructor(studyId: EntityId | null = null, options: { autoLoadLastRecording?: boolean } = {}) {
		this.state.studyId = studyId
		this.options = {
			autoLoadLastRecording: options.autoLoadLastRecording ?? true,
		}
	}

	public setStudyId(studyId: EntityId | null) {
		if (this.state.studyId === studyId) {
			return Promise.resolve()
		}

		this.state.studyId = studyId
		this.state.isLoading = true
		this.state.measurementId = null
		this.state.selectedParticipantId = null
		this.state.recordings = []
		this.state.recordingId = null
		this.state.qualityAnalysis = null
		this.state.recordingMarkers = []
		this.state.chartData = null
		this.state.error = null
		this.liveSamples = []
		this.sampleOriginIndex = null
		this.recordingSampleRanges = []
		this.restorePersistedState()

		return Promise.all([
			this.loadParticipants(),
			this.loadLatestRecordings(),
		])
			.then(() => this.restoreRuntimeState())
			.finally(() => {
				this.state.isLoading = false
			})
	}

	public initialize() {
		this.state.isLoading = true
		this.restorePersistedState()

		return Promise.all([
			this.loadDevices(),
			this.loadParticipants(),
			this.loadLatestRecordings(),
		])
			.then(() => this.restoreRuntimeState())
			.catch((error) => {
				if (!this.state.chartData) {
					this.handleError(error, 'Невідома помилка ініціалізації BPM')
					return
				}

				this.state.status = 'ready'
				this.state.error = null
			})
			.finally(() => {
				this.state.isLoading = false
			})
	}

	public startMeasurement() {
		if (!this.state.selectedDeviceId || !this.state.selectedParticipantId || !this.state.studyId) {
			this.state.error = 'Оберіть пристрій, учасника і дослідження'
			this.state.status = 'failed'
			return Promise.resolve()
		}

		this.state.isActionRunning = true
		this.resetLiveState()

		return this.api.startMeasurement({
			device_id: this.state.selectedDeviceId,
			participant_id: this.state.selectedParticipantId,
			study_id: this.state.studyId,
		}).then((measurement) => {
			this.applyMeasurement(measurement)
			this.state.status = 'measuring'
			this.connectStream(measurement.id)
		}).catch((error) => {
			this.handleError(error, 'Вимірювання не стартувало')
		}).finally(() => {
			this.state.isActionRunning = false
		})
	}

	public stopMeasurement() {
		if (!this.state.measurementId) {
			return Promise.resolve()
		}

		const measurementId = this.state.measurementId
		this.state.isActionRunning = true
		this.isStoppingMeasurement = true

		const stopActiveRecording = this.state.status === 'recording'
			? this.api.stopRecording(measurementId)
				.then((recording) => {
					this.applyRecording(recording)
				})
			: Promise.resolve()

		return stopActiveRecording
			.then(() => this.api.stopMeasurement(measurementId))
			.then((measurement) => {
				return this.finishStoppedMeasurement(measurement)
			})
			.catch((error) => {
				return this.recoverStoppedMeasurement(measurementId, error)
			})
			.finally(() => {
				this.state.isActionRunning = false
				this.isStoppingMeasurement = false
			})
	}

	public startRecording(durationSeconds = 15) {
		if (!this.isMeasurementActive() || !this.state.measurementId) {
			this.state.error = 'Спочатку стартуйте live-вимірювання'
			return Promise.resolve()
		}

		this.state.isActionRunning = true

		return this.api.startRecording(this.state.measurementId, {
			duration_s: durationSeconds,
			use_for_ml_training: this.state.useRecordingsForMlTraining === 'true',
		}).then((recording) => {
			this.applyRecording(recording)
			this.state.status = 'recording'
		}).catch((error) => {
			this.handleError(error, 'Запис не стартував')
		}).finally(() => {
			this.state.isActionRunning = false
		})
	}

	public stopRecording() {
		if (!this.state.measurementId) {
			return Promise.resolve()
		}

		this.state.isActionRunning = true

		return this.api.stopRecording(this.state.measurementId)
			.then((recording) => {
				this.applyRecording(recording)
				this.state.status = 'measuring'
			})
			.catch((error) => {
				this.handleError(error, 'Запис не зупинено')
			})
			.finally(() => {
				this.state.isActionRunning = false
			})
	}

	public toggleMeasurement() {
		return this.isMeasurementActive()
			? this.stopMeasurement()
			: this.startMeasurement()
	}

	public toggleRecording() {
		return this.isRecordingActive()
			? this.stopRecording()
			: this.startRecording()
	}

	public isMeasurementActive() {
		return this.state.status === 'measuring' || this.state.status === 'recording'
	}

	public isRecordingActive() {
		return this.state.status === 'recording'
	}

	public isMeasurementToggleDisabled() {
		const isMissingStartTarget = !this.state.selectedDeviceId || !this.state.selectedParticipantId || !this.state.studyId

		return this.state.isActionRunning || (!this.isMeasurementActive() && isMissingStartTarget)
	}

	public isRecordingToggleDisabled() {
		return this.state.isActionRunning || (!this.isRecordingActive() && !this.isMeasurementActive())
	}

	public canExportSelectedRecording() {
		return this.getSelectedRecording()?.status === 'completed'
	}

	public getRecordingExportUrl(format: 'csv' | 'json') {
		if (!this.canExportSelectedRecording() || !this.state.recordingId) {
			return null
		}

		return this.api.getRecordingExportUrl(this.state.recordingId, format)
	}

	public analyzeRecording(recordingId = this.state.recordingId) {
		if (!recordingId) {
			return Promise.resolve()
		}

		this.state.isActionRunning = true

		return this.api.runQualityAnalysis(recordingId)
			.then((analysis) => {
				this.state.qualityAnalysis = analysis
				this.state.signalReadiness = analysis.quality_result.level
			})
			.catch((error) => {
				this.handleError(error, 'Аналіз якості не виконано')
			})
			.finally(() => {
				this.state.isActionRunning = false
			})
	}

	public deleteRecording(recordingId: EntityId) {
		this.state.isActionRunning = true

		return this.api.deleteRecording(recordingId)
			.then(() => {
				this.state.recordings = this.state.recordings.filter((recording) => recording.id !== recordingId)
				this.recordingSampleRanges = this.recordingSampleRanges.filter((range) => range.recordingId !== recordingId)

				if (this.state.recordingId === recordingId) {
					this.state.recordingId = this.state.recordings[0]?.id ?? null
					this.state.chartData = null
					this.state.qualityAnalysis = null
					this.state.signalReadiness = null
					this.persistState()

					if (this.state.recordingId) {
						return this.loadRecording(this.state.recordingId).then(() => undefined)
					}
				}

				this.persistState()
				return undefined
			})
			.catch((error) => {
				this.handleError(error, 'Запис не видалено')
			})
			.finally(() => {
				this.state.isActionRunning = false
			})
	}

	public loadRecording(recordingId: EntityId) {
		this.state.isLoading = true
		this.state.recordingId = recordingId
		this.state.measurementId = null
		this.state.status = 'ready'
		this.state.qualityAnalysis = null
		this.state.error = null
		this.persistState()

		return this.ensureRecordingAvailable(recordingId)
			.then((recording) => {
				this.sampleOriginIndex = recording.sample_range.start_index
				this.setRecordingSampleRange(recording.id, recording.sample_range.start_index, recording.sample_range.end_index)
				this.persistState()
				return this.loadRecordingChart(recordingId)
					.then(() => Promise.allSettled([
						this.loadRecordingQuality(recording),
						this.loadRecordingMeasurement(recording.measurement_id),
					]))
			})
			.catch((error) => {
				this.handleError(error, 'Запис не завантажено')
			})
			.finally(() => {
				this.state.isLoading = false
			})
	}

	public destroy() {
		this.stream.disconnect()
	}

	private loadDevices() {
		return this.api.fetchDevices({
			connection_status: 'connected',
			limit: 50,
		}).then((devices) => {
			this.state.devices = devices
			this.state.selectedDeviceId = this.state.selectedDeviceId ?? devices[0]?.id ?? null
			this.persistState()

			return devices
		})
	}

	private loadParticipants() {
		return this.api.fetchParticipants({
			study_id: this.state.studyId ?? undefined,
			limit: 100,
		}).then((participants) => {
			this.state.participants = participants
			this.state.selectedParticipantId = this.state.selectedParticipantId ?? participants[0]?.id ?? null
			this.persistState()

			return participants
		})
	}

	private loadLatestRecordings() {
		return this.api.fetchRecordings({
			study_id: this.state.studyId ?? undefined,
			status: 'completed',
			limit: RECORDINGS_LIST_LIMIT,
		}).then((recordings) => {
			this.state.recordings = recordings
			this.state.recordingId = this.state.recordingId ?? recordings[0]?.id ?? null
			this.persistState()

			return recordings
		})
	}

	private loadRecordingChart(recordingId: EntityId, statusAfterLoad: BPMBlockState['status'] = 'ready') {
		return this.fetchAllRecordingSamples(recordingId).then((samples) => {
			this.applySamples(recordingId, samples)
			this.state.status = statusAfterLoad
			this.state.error = null
		})
	}

	private fetchAllRecordingSamples(recordingId: EntityId, offset = 0, collectedSamples: RecordingSample[] = []): Promise<RecordingSample[]> {
		return this.api.fetchRecordingSamples(recordingId, {
			limit: RECORDING_SAMPLES_PAGE_SIZE,
			offset,
		}).then((samples) => {
			const nextSamples = [...collectedSamples, ...samples]

			if (samples.length < RECORDING_SAMPLES_PAGE_SIZE) {
				return nextSamples
			}

			return this.fetchAllRecordingSamples(recordingId, offset + samples.length, nextSamples)
		})
	}

	private loadRecordingQuality(recording: Recording) {
		const applyAnalysis = (analysis: { quality_result: { level: QualityLevel } }) => {
			this.state.qualityAnalysis = analysis as typeof this.state.qualityAnalysis
			this.state.signalReadiness = analysis.quality_result.level
		}

		const runAnalysis = () => {
			return this.api.runQualityAnalysis(recording.id)
				.then(applyAnalysis)
				.catch(() => {
					this.state.qualityAnalysis = null
					this.state.signalReadiness = null
				})
		}

		if (!recording?.quality_analysis_id) {
			return runAnalysis()
		}

		return this.api.fetchQualityAnalysis(recording.id)
			.then(applyAnalysis)
			.catch(() => runAnalysis())
	}

	private loadRecordingMeasurement(measurementId: EntityId) {
		return this.api.fetchMeasurement(measurementId)
			.then((measurement) => {
				this.applyMeasurementSnapshot(measurement)
			})
			.catch(() => undefined)
	}

	private finishStoppedMeasurement(measurement: Measurement) {
		this.applyMeasurement(measurement)
		this.state.measurementId = null
		this.state.status = 'ready'
		this.stream.disconnect()
		return this.loadLatestRecordings()
	}

	private recoverStoppedMeasurement(measurementId: EntityId, error: unknown) {
		return this.api.fetchMeasurement(measurementId)
			.then((measurement) => {
				if (measurement.status !== 'running') {
					return this.finishStoppedMeasurement(measurement)
				}

				this.handleError(error, 'Вимірювання не зупинено')
				return undefined
			})
			.catch(() => {
				this.handleError(error, 'Вимірювання не зупинено')
			})
	}

	private connectStream(measurementId: EntityId) {
		this.stream.connect(measurementId, {
			onMessage: (message) => this.applyStreamMessage(message),
			onError: (message) => {
				this.state.error = message
			},
		})
	}

	private applyStreamMessage(message: MeasurementStreamMessage) {
		if (message.type === 'measurement_update') {
			this.state.measurementId = message.measurement_id
			if (message.active_recording_id) {
				this.state.recordingId = message.active_recording_id
			}
			this.state.sampleRateHz = this.resolveVisualValue('sampleRateHz', message.sample_rate_hz)
			this.state.sensorTempC = this.resolveVisualValue('sensorTempC', message.sensor_temp_c)
			this.state.bpm = this.resolveVisualValue('bpm', message.metrics.bpm)
			this.state.spo2 = this.resolveVisualValue('spo2', message.metrics.spo2)
			this.state.signalReadiness = this.resolveVisualLevel(
				message.metrics.signal_readiness?.level ?? null,
			)
			this.state.status = message.active_recording_id ? 'recording' : 'measuring'
			this.state.error = null
			this.captureVisualSnapshot()

			if (message.samples.length) {
				this.applyLiveSamples(message.active_recording_id ?? message.measurement_id, message.samples)
			}

			if (message.active_recording_id && !this.hasRecording(message.active_recording_id)) {
				void this.ensureRecordingAvailable(message.active_recording_id)
			}

			this.persistState()
		}

		if (message.type === 'recording_started') {
			this.state.recordingId = message.recording_id
			this.state.status = 'recording'
			this.setRecordingSampleRange(message.recording_id, message.sample_range.start_index, message.sample_range.end_index)
			this.state.qualityAnalysis = null
			this.state.signalReadiness = null
			this.state.progress = 0
			this.persistState()
			void this.ensureRecordingAvailable(message.recording_id)
		}

		if (message.type === 'recording_stopped') {
			this.state.recordingId = message.recording_id
			this.state.status = 'measuring'
			this.setRecordingSampleRange(message.recording_id, message.sample_range.start_index, message.sample_range.end_index)
			this.persistState()
			if (!this.isStoppingMeasurement) {
				void this.ensureRecordingAvailable(message.recording_id)
			}
		}

		if (message.type === 'measurement_finished') {
			this.state.measurementId = null
			this.state.status = 'ready'
			this.state.progress = 0
			this.stream.disconnect()
			this.persistState()
			void this.loadLatestRecordings()
		}
	}

	private applyMeasurement(measurement: Measurement) {
		this.state.measurementId = measurement.id
		if (measurement.active_recording_id || measurement.status === 'running') {
			this.state.recordingId = measurement.active_recording_id
		}
		this.state.selectedDeviceId = measurement.device_id
		this.state.selectedParticipantId = measurement.participant_id
		this.state.studyId = measurement.study_id
		this.state.sampleRateHz = this.resolveVisualValue('sampleRateHz', measurement.sample_rate_hz)
		this.state.sensorTempC = this.resolveVisualValue('sensorTempC', measurement.sensor_temp_c)
		this.state.bpm = this.resolveVisualValue('bpm', measurement.bpm)
		this.state.spo2 = this.resolveVisualValue('spo2', measurement.spo2)
		this.state.error = null
		this.captureVisualSnapshot()
		this.persistState()
	}

	private applyMeasurementSnapshot(measurement: Measurement) {
		this.state.selectedDeviceId = measurement.device_id
		this.state.selectedParticipantId = measurement.participant_id
		this.state.studyId = measurement.study_id
		this.state.sampleRateHz = this.resolveVisualValue('sampleRateHz', measurement.sample_rate_hz)
		this.state.sensorTempC = this.resolveVisualValue('sensorTempC', measurement.sensor_temp_c)
		this.state.bpm = this.resolveVisualValue('bpm', measurement.bpm)
		this.state.spo2 = this.resolveVisualValue('spo2', measurement.spo2)
		this.captureVisualSnapshot()
		this.persistState()
	}

	private applyRecording(recording: Recording) {
		this.upsertRecording(recording)
		this.state.recordingId = recording.id
		if (!this.isMeasurementActive() || this.sampleOriginIndex === null) {
			this.sampleOriginIndex = recording.sample_range.start_index
		}
		this.setRecordingSampleRange(recording.id, recording.sample_range.start_index, recording.sample_range.end_index)
		this.state.progress = recording.samples_count && recording.sample_range.end_index
			? 100
			: this.state.progress
		this.state.error = null
		this.persistState()
	}

	private applySamples(recordingId: EntityId, samples: RecordingSample[]) {
		if (!samples.length) {
			return
		}

		const sampleOriginIndex = this.resolveSampleOriginIndex(samples)

		this.state.chartData = createChartDataFromRecordingSamples(recordingId, samples, sampleOriginIndex)
		this.state.progress = Math.min(samples.length / 15, 100)
		this.updateRecordingMarkers()
	}

	private applyLiveSamples(sourceId: EntityId, samples: RecordingSample[]) {
		const samplesByIndex = new Map<number, RecordingSample>()

		for (const sample of this.liveSamples) {
			samplesByIndex.set(sample.index, sample)
		}

		for (const sample of samples) {
			samplesByIndex.set(sample.index, sample)
		}

		this.liveSamples = [...samplesByIndex.values()]
			.sort((left, right) => left.index - right.index)

		if (this.sampleOriginIndex === null) {
			this.sampleOriginIndex = this.liveSamples[0]?.index ?? null
			this.persistState()
		}

		this.applySamples(sourceId, this.liveSamples)
	}

	private resetLiveState() {
		this.state.error = null
		this.state.measurementId = null
		this.state.recordingId = null
		this.state.bpm = null
		this.state.spo2 = null
		this.state.signalReadiness = null
		this.state.qualityAnalysis = null
		this.state.recordingMarkers = []
		this.state.progress = 0
		this.state.chartData = null
		this.liveSamples = []
		this.sampleOriginIndex = null
		this.recordingSampleRanges = []
		this.persistState()
	}

	private handleError(error: unknown, fallbackMessage: string) {
		this.state.status = 'failed'
		this.state.error = getRequestErrorMessage(error, fallbackMessage)
	}

	private restoreRuntimeState() {
		return this.restoreActiveMeasurement()
			.then((isRestored) => {
				if (isRestored) {
					return
				}

				if (!this.options.autoLoadLastRecording) {
					this.state.recordingId = null
					this.state.chartData = null
					this.state.qualityAnalysis = null
					this.state.signalReadiness = null
					this.state.bpm = null
					this.state.spo2 = null
					this.lastVisualSnapshot = {
						sampleRateHz: null,
						sensorTempC: null,
						bpm: null,
						spo2: null,
						signalReadiness: null,
					}
					this.persistState()
					return
				}

				return this.loadPreferredRecording()
			})
	}

	private loadPreferredRecording() {
		if (!this.state.recordingId) {
			this.state.chartData = null
			this.state.qualityAnalysis = null
			this.state.signalReadiness = null
			this.persistState()
			return Promise.resolve()
		}

		return this.ensureRecordingAvailable(this.state.recordingId)
			.then((recording) => this.loadRecording(recording.id))
			.catch(() => {
				const fallbackRecordingId = this.state.recordings[0]?.id ?? null

				if (!fallbackRecordingId) {
					this.state.recordingId = null
					this.state.chartData = null
					this.state.qualityAnalysis = null
					this.state.signalReadiness = null
					this.persistState()
					return
				}

				return this.loadRecording(fallbackRecordingId)
			})
	}

	private restoreActiveMeasurement() {
		return this.api.fetchMeasurements({
			study_id: this.state.studyId ?? undefined,
			status: 'running',
			limit: 50,
		}).then((measurements) => {
			const measurement = this.pickActiveMeasurement(measurements)

			if (!measurement) {
				return false
			}

			this.applyMeasurement(measurement)

			if (measurement.active_recording_id) {
				this.state.status = 'recording'
				this.state.qualityAnalysis = null
				this.state.signalReadiness = null

				return this.ensureRecordingAvailable(measurement.active_recording_id)
					.then((recording) => {
						this.sampleOriginIndex = recording.sample_range.start_index
						this.setRecordingSampleRange(recording.id, recording.sample_range.start_index, recording.sample_range.end_index)
						this.persistState()
						return this.loadRecordingChart(measurement.active_recording_id!, 'recording')
					})
					.catch(() => undefined)
					.finally(() => {
						this.connectStream(measurement.id)
						this.persistState()
					})
					.then(() => true)
			}

			this.state.recordingId = null
			this.state.status = 'measuring'
			this.state.signalReadiness = null
			this.state.qualityAnalysis = null
			this.state.chartData = null
			this.state.progress = 0
			this.liveSamples = []
			this.connectStream(measurement.id)
			this.persistState()

			return true
		}).catch(() => false)
	}

	private pickActiveMeasurement(measurements: Measurement[]) {
		if (!measurements.length) {
			return null
		}

		return measurements.find((measurement) => measurement.id === this.state.measurementId)
			?? measurements.find((measurement) => measurement.device_id === this.state.selectedDeviceId)
			?? measurements.find((measurement) => measurement.participant_id === this.state.selectedParticipantId)
			?? measurements[0]
			?? null
	}

	private ensureRecordingAvailable(recordingId: EntityId) {
		const existingRecording = this.state.recordings.find((recording) => recording.id === recordingId)

		if (existingRecording) {
			return Promise.resolve(existingRecording)
		}

		return this.api.fetchRecording(recordingId)
			.then((recording) => {
				this.upsertRecording(recording)
				return recording
			})
	}

	private hasRecording(recordingId: EntityId) {
		return this.state.recordings.some((recording) => recording.id === recordingId)
	}

	private getSelectedRecording() {
		return this.state.recordings.find((recording) => recording.id === this.state.recordingId) ?? null
	}

	private upsertRecording(recording: Recording) {
		const nextRecordings = [
			recording,
			...this.state.recordings.filter((item) => item.id !== recording.id),
		]

		this.state.recordings = nextRecordings.slice(0, RECORDINGS_LIST_LIMIT)
	}

	private restorePersistedState() {
		const persistedState = this.readPersistedState()

		if (!persistedState) {
			return
		}

		this.state.measurementId = persistedState.measurementId
		this.state.recordingId = persistedState.recordingId
		this.state.selectedDeviceId = persistedState.selectedDeviceId
		this.state.selectedParticipantId = persistedState.selectedParticipantId
		this.state.useRecordingsForMlTraining = persistedState.useRecordingsForMlTraining === 'true' ? 'true' : 'false'
		this.sampleOriginIndex = persistedState.sampleOriginIndex
	}

	private persistState() {
		if (typeof window === 'undefined') {
			return
		}

		const storageKey = this.getStorageKey()
		const payload: BPMBlockPersistedState = {
			measurementId: this.state.measurementId,
			recordingId: this.state.recordingId,
			selectedDeviceId: this.state.selectedDeviceId,
			selectedParticipantId: this.state.selectedParticipantId,
			useRecordingsForMlTraining: this.state.useRecordingsForMlTraining,
			sampleOriginIndex: this.sampleOriginIndex,
		}

		window.localStorage.setItem(storageKey, JSON.stringify(payload))
	}

	private readPersistedState() {
		if (typeof window === 'undefined') {
			return null
		}

		const rawValue = window.localStorage.getItem(this.getStorageKey())

		if (!rawValue) {
			return null
		}

		try {
			return JSON.parse(rawValue) as BPMBlockPersistedState
		} catch {
			return null
		}
	}

	private getStorageKey() {
		return `${BPM_BLOCK_STORAGE_KEY_PREFIX}:${this.state.studyId ?? 'global'}`
	}

	private resolveSampleOriginIndex(samples: RecordingSample[]) {
		if (this.sampleOriginIndex === null) {
			this.sampleOriginIndex = samples[0]?.index ?? 0
			this.persistState()
		}

		return this.sampleOriginIndex
	}

	private setRecordingSampleRange(recordingId: EntityId, startIndex: number, endIndex: number | null) {
		const nextRange = {
			recordingId,
			startIndex,
			endIndex,
		}

		this.recordingSampleRanges = [
			...this.recordingSampleRanges.filter((range) => range.recordingId !== recordingId),
			nextRange,
		]
		this.updateRecordingMarkers()
	}

	private updateRecordingMarkers() {
		if (this.sampleOriginIndex === null) {
			this.state.recordingMarkers = []
			return
		}

		this.state.recordingMarkers = this.recordingSampleRanges.map((range) => {
			return {
				recordingId: range.recordingId,
				startSampleIndex: range.startIndex - this.sampleOriginIndex!,
				endSampleIndex: range.endIndex === null
					? null
					: range.endIndex - this.sampleOriginIndex!,
			}
		})
	}

	private resolveVisualValue(metric: Exclude<keyof BPMBlockVisualSnapshot, 'signalReadiness'>, value: number | null | undefined) {
		if (Number.isFinite(value)) {
			return Number(value)
		}

		return this.lastVisualSnapshot[metric]
	}

	private resolveVisualLevel(value: QualityLevel | null | undefined) {
		if (value === 'high' || value === 'medium' || value === 'low') {
			return value
		}

		return this.lastVisualSnapshot.signalReadiness
	}

	private captureVisualSnapshot() {
		this.lastVisualSnapshot = {
			sampleRateHz: this.resolveVisualValue('sampleRateHz', this.state.sampleRateHz),
			sensorTempC: this.resolveVisualValue('sensorTempC', this.state.sensorTempC),
			bpm: this.resolveVisualValue('bpm', this.state.bpm),
			spo2: this.resolveVisualValue('spo2', this.state.spo2),
			signalReadiness: this.resolveVisualLevel(this.state.signalReadiness),
		}
	}

}
