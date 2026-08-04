import type { EntityId, Study, StudyParticipant, Participant, Recording } from '../shared/entities'
import type { ParticipantFormState } from './participants'

export type StudyFormState = {
	title: string
	description: string
}

export type StudyAssignmentForms = Record<EntityId, EntityId | ''>

export type StudiesPageState = {
	studies: Study[]
	selectedStudy: Study | null
	participants: Participant[]
	studyParticipants: StudyParticipant[]
	recordings: Recording[]
	studyForm: StudyFormState
	participantForm: ParticipantFormState
	editingStudyId: EntityId | null
	editingParticipantId: EntityId | null
	isStudyModalOpen: boolean
	isParticipantModalOpen: boolean
	isStudySaving: boolean
	isParticipantSaving: boolean
	studyFormError: string
	participantFormError: string
	assignmentForms: StudyAssignmentForms
	pageError: string
}
