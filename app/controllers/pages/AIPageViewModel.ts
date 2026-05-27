import { reactive } from 'vue'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { AIChatSession, AIPageState, AIRecordingRow } from '~/types/pages/ai'
import type { AssistantMessage, EntityId, Recording } from '~/types/shared/entities'
import { formatDateValue, getQualityTone, getRequestErrorMessage } from '~/utils/shared'

const CHAT_CONTEXT_MESSAGE_LIMIT = 20
const CHAT_HISTORY_LIMIT = 20
const CHAT_STORAGE_KEY = 'pulso.assistant.chats.v1'

export class AIPageViewModel {
	private readonly api = new PulsoApiModel()
	public readonly contextMessageLimit = CHAT_CONTEXT_MESSAGE_LIMIT

	public readonly state = reactive<AIPageState>({
		assistantStatus: null,
		recordingRows: [],
		selectedRecordingId: '',
		message: '',
		messages: [],
		chats: [],
		activeChatId: '',
		isHistoryOpen: false,
		isLoading: true,
		isSending: false,
		pageError: '',
	})

	constructor() {
		this.loadChats()
	}

	public initialize(studyId: EntityId | null = null, activeRecordingId: EntityId | null = null) {
		this.state.isLoading = true
		this.state.pageError = ''

		return Promise.all([
			this.api.fetchAssistantStatus(),
			this.api.fetchRecordings({
				study_id: studyId ?? undefined,
				status: 'completed',
				limit: 50,
			}),
		]).then(([assistantStatus, recordings]) => {
			this.state.assistantStatus = assistantStatus
			return Promise.all(recordings.map((recording) => this.createRecordingRow(recording)))
				.then((recordingRows) => ({
					recordingRows,
					selectedRecordingId: activeRecordingId && recordings.some((recording) => recording.id === activeRecordingId)
						? activeRecordingId
						: '',
				}))
		}).then(({ recordingRows, selectedRecordingId }) => {
			this.state.recordingRows = recordingRows
			this.state.selectedRecordingId = this.state.activeChatId ? this.state.selectedRecordingId : selectedRecordingId
		}).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Асистент не завантажено')
			this.state.recordingRows = []
			this.state.selectedRecordingId = ''
		}).finally(() => {
			this.state.isLoading = false
		})
	}

	public title(row: AIRecordingRow) {
		return row.recording.id
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

	public metricValue(row: AIRecordingRow, metric: 'bpm' | 'spo2' | 'quality') {
		if (metric === 'bpm') {
			return Number.isFinite(row.measurement?.bpm) ? String(Math.round(Number(row.measurement?.bpm))) : '--'
		}

		if (metric === 'spo2') {
			return Number.isFinite(row.measurement?.spo2) ? `${Math.round(Number(row.measurement?.spo2))}%` : '--'
		}

		const score = row.qualityAnalysis?.quality_result.score

		return Number.isFinite(score) ? `${Math.round(Number(score) * 100)}%` : '--'
	}

	public qualityTone(row: AIRecordingRow) {
		const score = row.qualityAnalysis?.quality_result.score

		return getQualityTone(Number.isFinite(score) ? Number(score) * 100 : null)
	}

	public sendMessage() {
		const recordingId = this.state.selectedRecordingId
		const message = this.state.message.trim()

		if (!recordingId || !message) {
			return Promise.resolve()
		}

		this.state.isSending = true
		this.state.pageError = ''
		this.state.message = ''
		const conversationHistory = this.createConversationHistory(recordingId)
		this.state.messages.push(this.createUserMessage(recordingId, message))
		this.saveActiveChat(recordingId)

		return this.api.sendAssistantMessage(recordingId, message, conversationHistory)
			.then((assistantMessage) => {
				this.state.messages.push(assistantMessage)
				this.saveActiveChat(recordingId)
			})
			.catch((error) => {
				this.state.pageError = getRequestErrorMessage(error, 'Асистент не відповів')
			})
			.finally(() => {
				this.state.isSending = false
			})
	}

	public startNewChat() {
		if (this.state.isSending) {
			return
		}

		this.state.message = ''
		this.state.messages = []
		this.state.activeChatId = ''
		this.state.isHistoryOpen = false
		this.state.pageError = ''
	}

	public toggleHistory() {
		this.state.isHistoryOpen = !this.state.isHistoryOpen
	}

	public selectChat(chatId: string) {
		if (this.state.isSending) {
			return
		}

		const chat = this.state.chats.find((item) => item.id === chatId)
		if (!chat) {
			return
		}

		this.state.activeChatId = chat.id
		this.state.selectedRecordingId = chat.recordingId
		this.state.messages = [...chat.messages]
		this.state.message = ''
		this.state.pageError = ''
		this.state.isHistoryOpen = false
	}

	public formatChatDate(value: string) {
		return formatDateValue(value)
	}

	public remainingContextMessages() {
		const count = this.state.messages
			.filter((item) => item.recording_id === this.state.selectedRecordingId)
			.length
		return Math.max(0, this.contextMessageLimit - count)
	}

	private createUserMessage(recordingId: EntityId, message: string): AssistantMessage {
		return {
			recording_id: recordingId,
			quality_analysis_id: null,
			timestamp: new Date().toISOString(),
			provider: {
				type: 'user',
				model: 'operator',
			},
			message,
		}
	}

	private createConversationHistory(recordingId: EntityId) {
		return this.state.messages
			.filter((item) => item.recording_id === recordingId)
			.slice(-CHAT_CONTEXT_MESSAGE_LIMIT)
			.map((item) => ({
				role: item.provider.type === 'user' ? 'user' as const : 'assistant' as const,
				message: item.message,
			}))
	}

	private loadChats() {
		if (typeof window === 'undefined') {
			return
		}

		try {
			const parsed = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) || '[]')
			if (!Array.isArray(parsed)) {
				return
			}

			this.state.chats = parsed
				.filter((item): item is AIChatSession => this.isChatSession(item))
				.slice(0, CHAT_HISTORY_LIMIT)
		} catch {
			this.state.chats = []
		}
	}

	private saveActiveChat(recordingId: EntityId) {
		if (!this.state.messages.length) {
			return
		}

		const now = new Date().toISOString()
		const activeChatId = this.state.activeChatId || this.createChatId()
		const existingChat = this.state.chats.find((item) => item.id === activeChatId)
		const chat: AIChatSession = {
			id: activeChatId,
			title: this.createChatTitle(recordingId),
			recordingId,
			messages: [...this.state.messages],
			createdAt: existingChat?.createdAt || now,
			updatedAt: now,
		}

		this.state.activeChatId = activeChatId
		this.state.chats = [
			chat,
			...this.state.chats.filter((item) => item.id !== activeChatId),
		].slice(0, CHAT_HISTORY_LIMIT)
		this.persistChats()
	}

	private persistChats() {
		if (typeof window === 'undefined') {
			return
		}

		try {
			window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.state.chats))
		} catch {
			// Local chat history is best-effort; sending messages should not fail if storage is full.
		}
	}

	private createChatTitle(recordingId: EntityId) {
		const firstUserMessage = this.state.messages.find((item) => item.provider.type === 'user')?.message.trim()
		if (!firstUserMessage) {
			return recordingId
		}

		return firstUserMessage.length > 42 ? `${firstUserMessage.slice(0, 39)}...` : firstUserMessage
	}

	private createChatId() {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID()
		}
		return `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
	}

	private isChatSession(item: unknown): item is AIChatSession {
		if (!item || typeof item !== 'object') {
			return false
		}
		const value = item as Partial<AIChatSession>
		return (
			typeof value.id === 'string'
			&& typeof value.title === 'string'
			&& typeof value.recordingId === 'string'
			&& Array.isArray(value.messages)
			&& typeof value.createdAt === 'string'
			&& typeof value.updatedAt === 'string'
		)
	}

	private createRecordingRow(recording: Recording): Promise<AIRecordingRow> {
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
