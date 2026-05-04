import { reactive } from 'vue'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { AIPageState } from '~/types/pages/ai'
import type { AssistantMessage, EntityId } from '~/types/shared/entities'
import { getRequestErrorMessage } from '~/utils/shared'

export class AIPageViewModel {
	private readonly api = new PulsoApiModel()

	public readonly state = reactive<AIPageState>({
		assistantStatus: null,
		recordings: [],
		selectedRecordingId: '',
		message: '',
		messages: [],
		isLoading: true,
		isSending: false,
		pageError: '',
	})

	public initialize(projectId: EntityId | null = null) {
		this.state.isLoading = true
		this.state.pageError = ''

		return Promise.all([
			this.api.fetchAssistantStatus(),
			this.api.fetchRecordings({
				project_id: projectId ?? undefined,
				status: 'completed',
				limit: 50,
			}),
		]).then(([assistantStatus, recordings]) => {
			this.state.assistantStatus = assistantStatus
			this.state.recordings = recordings
			this.state.selectedRecordingId = recordings[0]?.id ?? ''
		}).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Асистент не завантажено')
		}).finally(() => {
			this.state.isLoading = false
		})
	}

	public sendMessage() {
		const recordingId = this.state.selectedRecordingId
		const message = this.state.message.trim()

		if (!recordingId || !message) {
			return Promise.resolve()
		}

		this.state.isSending = true
		this.state.pageError = ''

		return this.api.sendAssistantMessage(recordingId, message)
			.then((assistantMessage) => {
				this.state.messages.push(this.createUserMessage(recordingId, message))
				this.state.messages.push(assistantMessage)
				this.state.message = ''
			})
			.catch((error) => {
				this.state.pageError = getRequestErrorMessage(error, 'Асистент не відповів')
			})
			.finally(() => {
				this.state.isSending = false
			})
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
}
