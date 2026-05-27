import type { AssistantMessage, AssistantStatus, Measurement, QualityAnalysis, Recording } from '../shared/entities'

export type AIChatSession = {
	id: string
	title: string
	recordingId: string
	messages: AssistantMessage[]
	createdAt: string
	updatedAt: string
}

export type AIRecordingRow = {
	recording: Recording
	measurement: Measurement | null
	qualityAnalysis: QualityAnalysis | null
}

export type AIPageState = {
	assistantStatus: AssistantStatus | null
	recordingRows: AIRecordingRow[]
	selectedRecordingId: string
	message: string
	messages: AssistantMessage[]
	chats: AIChatSession[]
	activeChatId: string
	isHistoryOpen: boolean
	isLoading: boolean
	isSending: boolean
	pageError: string
}
