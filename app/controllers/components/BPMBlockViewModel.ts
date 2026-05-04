import { reactive } from 'vue'
import { createChartDataFromPulseSamples, createChartDataFromRecordingSamples } from '~/controllers/components/pulseSamplesChart'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import { PulsoMeasurementStreamModel, type MeasurementStreamMessage } from '~/models/PulsoMeasurementStreamModel'
import type { BPMBlockState, BPMChartData, PulseSample } from '~/types/components/bpm-block'
import type { EntityId, Measurement, Recording, RecordingSample } from '~/types/shared/entities'

const PREVIEW_MEASUREMENT_ID = '16a557e8-0b0e-4e3f-9280-c7beea853018'
const PREVIEW_FIRST_SAMPLE_ID = 24105
const PREVIEW_STARTED_AT = Date.parse('2026-04-29T20:02:05.314258Z')

const PREVIEW_SAMPLE_VALUES = [
	[104453, 136932],
	[102520, 131459],
	[102523, 131539],
	[102536, 131584],
	[102550, 131633],
	[102549, 131686],
	[102572, 131737],
	[102579, 131802],
	[102565, 131783],
	[102422, 131408],
	[102306, 131002],
	[102233, 130865],
	[102236, 130888],
	[102231, 130904],
	[102220, 130874],
	[102221, 130919],
	[102239, 130970],
	[102239, 131002],
	[102239, 130998],
	[102239, 131000],
	[102256, 131060],
	[102254, 131120],
	[102282, 131171],
	[102294, 131242],
	[102321, 131328],
	[102333, 131357],
	[102358, 131426],
	[102362, 131476],
	[102379, 131547],
	[102383, 131602],
	[102375, 131514],
	[102234, 131146],
	[102153, 130896],
	[102130, 130847],
	[102126, 130862],
	[102106, 130851],
	[102094, 130819],
	[102119, 130854],
	[102097, 130909],
	[102070, 130859],
	[102076, 130838],
	[102078, 130874],
	[102081, 130927],
	[102103, 130963],
	[102096, 131043],
	[102122, 131089],
	[102124, 131146],
	[102151, 131202],
	[102144, 131249],
	[102165, 131309],
	[102197, 131343],
	[102195, 131428],
	[102164, 131390],
	[102055, 131122],
	[102021, 130959],
	[102012, 130954],
	[102036, 131049],
	[102013, 131086],
	[102016, 131134],
	[102033, 131191],
	[102057, 131218],
	[102050, 131202],
	[102073, 131245],
	[102081, 131291],
	[102095, 131344],
	[102109, 131385],
	[102121, 131439],
	[102116, 131492],
	[102124, 131510],
	[102128, 131565],
	[102170, 131596],
	[102177, 131643],
	[102167, 131653],
	[102100, 131442],
	[102020, 131227],
	[102023, 131215],
	[102003, 131269],
	[102009, 131255],
	[102011, 131229],
	[102005, 131251],
	[102006, 131307],
	[101990, 131291],
	[101986, 131282],
	[101987, 131304],
	[101992, 131313],
	[102010, 131366],
	[102034, 131415],
	[102034, 131465],
	[102020, 131485],
	[102025, 131521],
	[102035, 131557],
	[102038, 131583],
	[102040, 131635],
	[102063, 131664],
	[102044, 131646],
	[101970, 131405],
	[101900, 131194],
	[101888, 131189],
	[101893, 131255],
	[101868, 131243],
	[101867, 131237],
	[101878, 131275],
	[101900, 131305],
	[101865, 131307],
	[101870, 131299],
	[101864, 131317],
	[101871, 131354],
	[101887, 131412],
	[101888, 131450],
	[101913, 131499],
	[101894, 131522],
	[101919, 131555],
	[101915, 131590],
	[101923, 131612],
	[101939, 131671],
	[101942, 131681],
	[101946, 131738],
	[101943, 131734],
	[101897, 131567],
	[101820, 131330],
	[101810, 131321],
	[101833, 131376],
	[101815, 131356],
	[101801, 131348],
	[101807, 131410],
	[101807, 131410],
	[101799, 131403],
	[101776, 131385],
	[101782, 131391],
	[101787, 131428],
	[101795, 131468],
	[101803, 131501],
	[101808, 131546],
	[101823, 131569],
	[101831, 131582],
	[101840, 131611],
	[101821, 131648],
	[101827, 131665],
	[101824, 131706],
	[101855, 131747],
	[101833, 131737],
	[101774, 131520],
	[101705, 131340],
	[101696, 131320],
	[101709, 131354],
	[101698, 131355],
	[101689, 131344],
	[101685, 131397],
	[101690, 131400],
	[101668, 131352],
	[101661, 131348],
	[101650, 131367],
	[101685, 131413],
	[101695, 131469],
	[101679, 131492],
	[101687, 131489],
	[101692, 131528],
	[101693, 131554],
	[101691, 131608],
	[101718, 131640],
	[101727, 131652],
	[101731, 131724],
	[101723, 131730],
	[101683, 131567],
	[101590, 131305],
	[101563, 131231],
	[101561, 131268],
	[101566, 131265],
	[101554, 131226],
	[101536, 131235],
	[101541, 131264],
	[101523, 131295],
	[101528, 131278],
	[101536, 131271],
	[101531, 131335],
	[101549, 131378],
	[101563, 131407],
	[101558, 131436],
	[101560, 131467],
	[101562, 131521],
	[101574, 131526],
	[101572, 131571],
	[101585, 131616],
	[101610, 131656],
	[101613, 131684],
	[101586, 131655],
	[101504, 131410],
	[101441, 131216],
	[101439, 131206],
	[101447, 131244],
	[101439, 131235],
	[101411, 131231],
	[101446, 131259],
	[101443, 131285],
	[101419, 131276],
	[101425, 131266],
	[101427, 131285],
	[101431, 131307],
	[101424, 131346],
	[101450, 131420],
	[101450, 131435],
	[101482, 131481],
	[101500, 131518],
	[101474, 131532],
	[101505, 131555],
	[101510, 131597],
	[101522, 131642],
	[101538, 131691],
	[101477, 131536],
	[101392, 131306],
	[101362, 131214],
	[101387, 131242],
	[101361, 131263],
	[101365, 131250],
	[101371, 131271],
	[101362, 131299],
	[101370, 131266],
	[101343, 131240],
	[101361, 131259],
	[101349, 131273],
	[101345, 131296],
	[101384, 131349],
	[101377, 131384],
	[101386, 131415],
	[101391, 131430],
	[101393, 131461],
	[101414, 131515],
	[101435, 131549],
	[101362, 131390],
	[101283, 131154],
	[101229, 131010],
	[101250, 131012],
	[101241, 131037],
	[101206, 130988],
	[101218, 130976],
	[101209, 131011],
	[101191, 130997],
	[101171, 130978],
	[101187, 130979],
	[101163, 130998],
	[101189, 131047],
	[101209, 131085],
	[101210, 131128],
	[101229, 131204],
	[101242, 131247],
	[101241, 131270],
	[101255, 131312],
	[101270, 131392],
	[101259, 131367],
	[101186, 131118],
	[101101, 130920],
	[101107, 130898],
	[101123, 130939],
	[101101, 130919],
	[101082, 130875],
	[101088, 130937],
	[101109, 130994],
	[101104, 130967],
	[101091, 130969],
	[101108, 131017],
	[101102, 131043],
	[101120, 131118],
	[101129, 131146],
	[101161, 131217],
	[101152, 131245],
	[101176, 131298],
	[101193, 131342],
	[101204, 131416],
	[101211, 131428],
	[101233, 131465],
	[101161, 131274],
	[101123, 131129],
	[101122, 131133],
	[101146, 131172],
	[101121, 131184],
	[101110, 131185],
	[101138, 131209],
	[101143, 131262],
	[101130, 131268],
	[101146, 131288],
	[101141, 131299],
	[101177, 131337],
	[101167, 131375],
	[101184, 131420],
	[101194, 131455],
	[101187, 131495],
	[101213, 131539],
	[101246, 131570],
	[101247, 131601],
	[101272, 131645],
	[101264, 131707],
	[101284, 131685],
	[101229, 131529],
	[101206, 131426],
	[101229, 131489],
	[101213, 131519],
	[101234, 131535],
	[101227, 131568],
	[101226, 131615],
	[101241, 131631],
	[101236, 131614],
	[101238, 131630],
	[101247, 131663],
	[101248, 131702],
	[101262, 131754],
	[101278, 131782],
	[101293, 131817],
	[101309, 131837],
	[101315, 131872],
	[101312, 131912],
	[101312, 131941],
	[101329, 131941],
	[101254, 131815],
	[101242, 131662],
	[101220, 131683],
	[101233, 131742],
	[101254, 131750],
	[101245, 131735],
	[101249, 131745],
	[101250, 131792],
	[101242, 131785],
	[101244, 131780],
	[101241, 131812],
	[101246, 131838],
	[101223, 131863],
	[101257, 131879],
	[101265, 131927],
	[101247, 131955],
	[101281, 131978],
	[101297, 132001],
	[101274, 132011],
	[101297, 132059],
	[101300, 132068],
	[101230, 131882],
	[101170, 131729],
	[101175, 131738],
	[101185, 131765],
	[101167, 131739],
	[101129, 131705],
	[101130, 131730],
	[101136, 131761],
	[101118, 131750],
	[101122, 131721],
	[101130, 131726],
	[101113, 131750],
	[101128, 131769],
	[101145, 131798],
	[101140, 131844],
	[101128, 131838],
	[101131, 131872],
	[101126, 131892],
	[101131, 131904],
	[101161, 131942],
	[101152, 131962],
	[101162, 131985],
	[101093, 131825],
	[101036, 131585],
	[101026, 131562],
	[101016, 131593],
	[101007, 131580],
	[100971, 131543],
	[100970, 131540],
	[100998, 131534],
	[100973, 131540],
	[100959, 131509],
	[100941, 131510],
	[100937, 131529],
	[100948, 131544],
	[100954, 131575],
	[100968, 131600],
	[100970, 131636],
	[100983, 131657],
	[100990, 131649],
	[101008, 131722],
	[101015, 131728],
] as const

export class BPMBlockViewModel {
	public readonly state = reactive<BPMBlockState>({
		status: 'ready',
		progress: 0,
		measurementId: PREVIEW_MEASUREMENT_ID,
		recordingId: null,
		projectId: null,
		selectedDeviceId: null,
		selectedUserId: null,
		devices: [],
		users: [],
		recordings: [],
		isLoading: true,
		isActionRunning: false,
		sampleRateHz: null,
		sensorTempC: null,
		bpm: null,
		spo2: null,
		signalQuality: null,
		qualityAnalysis: null,
		chartData: createPreviewChartData(),
		error: null,
	})

	private readonly api = new PulsoApiModel()
	private readonly stream = new PulsoMeasurementStreamModel()

	public constructor(projectId: EntityId | null = null) {
		this.state.projectId = projectId
	}

	public setProjectId(projectId: EntityId | null) {
		if (this.state.projectId === projectId) {
			return Promise.resolve()
		}

		this.state.projectId = projectId
		this.state.selectedUserId = null
		this.state.recordings = []
		this.state.recordingId = null

		return Promise.all([
			this.loadUsers(),
			this.loadLatestRecordings(),
		]).then(() => this.loadLatestRecordingChart())
	}

	public initialize() {
		this.state.isLoading = true

		return Promise.all([
			this.loadDevices(),
			this.loadUsers(),
			this.loadLatestRecordings(),
		])
			.then(() => this.loadLatestRecordingChart())
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
		if (!this.state.selectedDeviceId || !this.state.selectedUserId || !this.state.projectId) {
			this.state.error = 'Оберіть пристрій, користувача і проєкт'
			this.state.status = 'failed'
			return Promise.resolve()
		}

		this.state.isActionRunning = true
		this.resetLiveState()

		return this.api.startMeasurement({
			device_id: this.state.selectedDeviceId,
			user_id: this.state.selectedUserId,
			project_id: this.state.projectId,
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

		this.state.isActionRunning = true

		return this.api.stopMeasurement(this.state.measurementId)
			.then((measurement) => {
				this.applyMeasurement(measurement)
				this.state.status = 'ready'
				this.stream.disconnect()
				return this.loadLatestRecordings()
			})
			.catch((error) => {
				this.handleError(error, 'Вимірювання не зупинено')
			})
			.finally(() => {
				this.state.isActionRunning = false
			})
	}

	public startRecording(durationSeconds = 15) {
		if (!this.state.measurementId) {
			this.state.error = 'Спочатку стартуйте live-вимірювання'
			return Promise.resolve()
		}

		this.state.isActionRunning = true

		return this.api.startRecording(this.state.measurementId, {
			duration_s: durationSeconds,
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
				return this.loadRecordingChart(recording.id)
			})
			.catch((error) => {
				this.handleError(error, 'Запис не зупинено')
			})
			.finally(() => {
				this.state.isActionRunning = false
			})
	}

	public analyzeRecording(recordingId = this.state.recordingId) {
		if (!recordingId) {
			return Promise.resolve()
		}

		this.state.isActionRunning = true

		return this.api.runQualityAnalysis(recordingId)
			.then((analysis) => {
				this.state.qualityAnalysis = analysis
				this.state.signalQuality = Math.round(analysis.quality_result.score * 100)
			})
			.catch((error) => {
				this.handleError(error, 'Аналіз якості не виконано')
			})
			.finally(() => {
				this.state.isActionRunning = false
			})
	}

	public loadRecording(recordingId: EntityId) {
		this.state.recordingId = recordingId
		this.state.error = null

		return this.loadRecordingChart(recordingId)
			.then(() => this.loadRecordingQuality(recordingId))
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

			return devices
		})
	}

	private loadUsers() {
		return this.api.fetchUsers({
			project_id: this.state.projectId ?? undefined,
			limit: 100,
		}).then((users) => {
			this.state.users = users
			this.state.selectedUserId = this.state.selectedUserId ?? users[0]?.id ?? null

			return users
		})
	}

	private loadLatestRecordings() {
		return this.api.fetchRecordings({
			project_id: this.state.projectId ?? undefined,
			status: 'completed',
			limit: 12,
		}).then((recordings) => {
			this.state.recordings = recordings
			this.state.recordingId = this.state.recordingId ?? recordings[0]?.id ?? null

			return recordings
		})
	}

	private loadLatestRecordingChart() {
		if (!this.state.recordingId) {
			return Promise.resolve()
		}

		return this.loadRecording(this.state.recordingId)
	}

	private loadRecordingChart(recordingId: EntityId) {
		return this.api.fetchRecordingSamples(recordingId, {
			limit: 1000,
			offset: 0,
		}).then((samples) => {
			this.applySamples(recordingId, samples)
			this.state.status = 'ready'
			this.state.error = null
		})
	}

	private loadRecordingQuality(recordingId: EntityId) {
		return this.api.fetchQualityAnalysis(recordingId)
			.then((analysis) => {
				this.state.qualityAnalysis = analysis
				this.state.signalQuality = Math.round(analysis.quality_result.score * 100)
			})
			.catch(() => undefined)
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
			this.state.recordingId = message.active_recording_id
			this.state.sampleRateHz = message.sample_rate_hz
			this.state.sensorTempC = message.sensor_temp_c
			this.state.bpm = message.metrics.bpm
			this.state.spo2 = message.metrics.spo2
			this.state.signalQuality = message.metrics.live_quality
				? Math.round(message.metrics.live_quality.score * 100)
				: this.state.signalQuality
			this.state.status = message.active_recording_id ? 'recording' : 'measuring'
			this.state.error = null

			if (message.active_recording_id) {
				this.applySamples(message.active_recording_id, message.samples)
			}
		}

		if (message.type === 'recording_started') {
			this.state.recordingId = message.recording_id
			this.state.status = 'recording'
		}

		if (message.type === 'recording_stopped') {
			this.state.recordingId = message.recording_id
			this.state.status = 'measuring'
			this.loadRecordingChart(message.recording_id)
		}

		if (message.type === 'measurement_finished') {
			this.state.status = 'ready'
			this.state.progress = 0
			this.stream.disconnect()
			this.loadLatestRecordings()
		}
	}

	private applyMeasurement(measurement: Measurement) {
		this.state.measurementId = measurement.id
		this.state.recordingId = measurement.active_recording_id
		this.state.selectedDeviceId = measurement.device_id
		this.state.selectedUserId = measurement.user_id
		this.state.projectId = measurement.project_id
		this.state.sampleRateHz = measurement.sample_rate_hz
		this.state.sensorTempC = measurement.sensor_temp_c
		this.state.bpm = measurement.bpm
		this.state.spo2 = measurement.spo2
		this.state.error = null
	}

	private applyRecording(recording: Recording) {
		this.state.recordingId = recording.id
		this.state.progress = recording.samples_count && recording.sample_range.end_index
			? 100
			: this.state.progress
		this.state.error = null
	}

	private applySamples(recordingId: EntityId, samples: RecordingSample[]) {
		if (!samples.length) {
			return
		}

		this.state.chartData = createChartDataFromRecordingSamples(recordingId, samples)
		this.state.progress = Math.min(samples.length / 15, 100)
	}

	private resetLiveState() {
		this.state.error = null
		this.state.measurementId = null
		this.state.recordingId = null
		this.state.bpm = null
		this.state.spo2 = null
		this.state.signalQuality = null
		this.state.qualityAnalysis = null
		this.state.progress = 0
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
	return PREVIEW_SAMPLE_VALUES.map(([r, ir], sampleIndex) => {
		return {
			id: PREVIEW_FIRST_SAMPLE_ID + sampleIndex,
			recording_id: PREVIEW_MEASUREMENT_ID,
			sample_index: sampleIndex,
			raw_data: {
				r,
				ir,
			},
			created_at: new Date(PREVIEW_STARTED_AT + sampleIndex * 40).toISOString(),
		}
	})
}
