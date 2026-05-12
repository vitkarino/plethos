import { reactive } from 'vue'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { EntityId, Measurement, QualityAnalysis, Recording } from '~/types/shared/entities'
import { formatDateValue, getRequestErrorMessage } from '~/utils/shared'

const RECORDINGS_PANEL_LIMIT = 24

export type ActivityRecordingRow = {
	recording: Recording
	measurement: Measurement | null
	qualityAnalysis: QualityAnalysis | null
}

type ActivityRecordsPanelState = {
	rows: ActivityRecordingRow[]
	isLoading: boolean
	error: string
}

export class ActivityRecordsPanelViewModel {
	public readonly state = reactive<ActivityRecordsPanelState>({
		rows: [],
		isLoading: false,
		error: '',
	})

	private readonly api = new PulsoApiModel()
	private loadToken = 0

	public load(projectId: EntityId | null = null) {
		const token = ++this.loadToken

		this.state.isLoading = true
		this.state.error = ''

		return this.api.fetchRecordings({
			project_id: projectId ?? undefined,
			status: 'completed',
			limit: RECORDINGS_PANEL_LIMIT,
		}).then((recordings) => {
			if (token !== this.loadToken) {
				return
			}

			return Promise.all(recordings.map((recording) => this.createRecordingRow(recording)))
		}).then((rows) => {
			if (!rows || token !== this.loadToken) {
				return
			}

			this.state.rows = rows
		}).catch((error) => {
			if (token !== this.loadToken) {
				return
			}

			this.state.error = getRequestErrorMessage(error, 'Записи не завантажено')
			this.state.rows = []
		}).finally(() => {
			if (token === this.loadToken) {
				this.state.isLoading = false
			}
		})
	}

	public title(row: ActivityRecordingRow) {
		return `Запис ${row.recording.id}`
	}

	public shortRecordingId(recording: Recording) {
		return recording.id
	}

	public formatDate(value?: string | null) {
		return value ? formatDateValue(value) : 'Дата невідома'
	}

	public formatDuration(recording: Recording) {
		const durationMs = recording.time.duration_ms

		if (!Number.isFinite(durationMs)) {
			return 'Тривалість не визначена'
		}

		const seconds = Math.max(0, Math.round(Number(durationMs) / 1000))
		const minutes = Math.floor(seconds / 60)
		const restSeconds = seconds % 60

		if (minutes <= 0) {
			return `${restSeconds} с`
		}

		return `${minutes} хв ${restSeconds.toString().padStart(2, '0')} с`
	}

	public formatSamples(recording: Recording) {
		if (!Number.isFinite(recording.samples_count)) {
			return 'Семпли відсутні'
		}

		return `${Number(recording.samples_count).toLocaleString('uk-UA')} семплів`
	}

	public statusLabel(recording: Recording) {
		if (recording.status === 'completed') {
			return 'Готово'
		}

		if (recording.status === 'running') {
			return 'Триває'
		}

		if (recording.status === 'failed') {
			return 'Помилка'
		}

		return 'Скасовано'
	}

	public metricValue(row: ActivityRecordingRow, metric: 'bpm' | 'spo2' | 'quality') {
		if (metric === 'bpm') {
			return Number.isFinite(row.measurement?.bpm) ? String(Math.round(Number(row.measurement?.bpm))) : '--'
		}

		if (metric === 'spo2') {
			return Number.isFinite(row.measurement?.spo2) ? `${Math.round(Number(row.measurement?.spo2))}%` : '--'
		}

		const score = row.qualityAnalysis?.quality_result.score

		return Number.isFinite(score) ? `${Math.round(Number(score) * 100)}%` : '--'
	}

	private createRecordingRow(recording: Recording): Promise<ActivityRecordingRow> {
		return Promise.all([
			this.api.fetchMeasurement(recording.measurement_id).catch(() => null),
			recording.quality_analysis_id
				? this.api.fetchQualityAnalysis(recording.id).catch(() => null)
				: Promise.resolve(null),
		]).then(([measurement, qualityAnalysis]) => ({
			recording,
			measurement,
			qualityAnalysis,
		}))
	}
}
