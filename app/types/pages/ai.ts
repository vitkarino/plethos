import type { AssistantMessage, AssistantStatus, Recording } from '../shared/entities'

export type AIPageState = {
	assistantStatus: AssistantStatus | null
	recordings: Recording[]
	selectedRecordingId: string
	message: string
	messages: AssistantMessage[]
	isLoading: boolean
	isSending: boolean
	pageError: string
}
