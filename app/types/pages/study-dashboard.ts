import type { AssignedParticipant, Study, StudyParticipant, Participant } from '../shared/entities'

export type StudyDashboardPageState = {
	studyName: string
	studies: Study[]
	participants: Participant[]
	studyParticipants: StudyParticipant[]
	study: Study | null
	assignedParticipants: AssignedParticipant[]
	isLoading: boolean
	pageError: string
}
