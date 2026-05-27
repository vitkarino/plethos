import type { EntityId, Study, StudyParticipant, Sex, Participant } from '../shared/entities'

export type ParticipantFormState = {
	name: string
	age: number | ''
	sex: Sex
}

export type ParticipantsPageState = {
	participants: Participant[]
	studies: Study[]
	studyParticipants: StudyParticipant[]
	participantForm: ParticipantFormState
	editingParticipantId: EntityId | null
	isParticipantModalOpen: boolean
	isParticipantSaving: boolean
	participantFormError: string
	pageError: string
}
