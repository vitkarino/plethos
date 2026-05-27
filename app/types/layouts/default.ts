import type { EntityId, Study, StudyParticipant, Sex, Participant } from '../shared/entities'

export type LayoutStudyFormState = {
	title: string
	description: string
}

export type LayoutParticipantFormState = {
	name: string
	age: number | ''
	sex: Sex
}

export type SidebarPanelKey = 'records' | 'studies' | 'participants' | 'ai'

export type DefaultLayoutState = {
	studies: Study[]
	selectedStudy: Study | null
	participants: Participant[]
	studyParticipants: StudyParticipant[]
	studyForm: LayoutStudyFormState
	participantForm: LayoutParticipantFormState
	editingStudyId: EntityId | null
	editingParticipantId: EntityId | null
	isStudyModalOpen: boolean
	isParticipantModalOpen: boolean
	activeSidebarPanel: SidebarPanelKey | null
	isStudySaving: boolean
	isParticipantSaving: boolean
	studyFormError: string
	participantFormError: string
	pageError: string
}
