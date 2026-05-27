import { reactive } from 'vue'
import { STUDY_DESCRIPTION_MAX_LENGTH } from '~/constants/forms'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { StudiesPageState } from '~/types/pages/studies'
import type { AssignedParticipant, EntityId, Study, Participant } from '~/types/shared/entities'
import {
	clearSelectedStudyId,
	formatDateTimeValue,
	formatDateValue,
	getStudyRoutePath,
	getRequestErrorMessage,
	getParticipantInitials,
	readSelectedStudyId,
	setSelectedStudyId,
	toStudySlug,
} from '~/utils/shared'

export class StudiesPageViewModel {
	private readonly api = new PulsoApiModel()

	public readonly state = reactive<StudiesPageState>({
		studies: [],
		selectedStudy: null,
		participants: [],
		studyParticipants: [],
		recordings: [],
		studyForm: {
			title: '',
			description: '',
		},
		participantForm: {
			name: '',
			age: '',
			sex: 'male',
		},
		editingStudyId: null,
		editingParticipantId: null,
		isStudyModalOpen: false,
		isParticipantModalOpen: false,
		isStudySaving: false,
		isParticipantSaving: false,
		studyFormError: '',
		participantFormError: '',
		assignmentForms: {},
		pageError: '',
	})

	public initialize() {
		return Promise.all([
			this.refreshStudies(),
			this.loadParticipants(),
			this.refreshStudyParticipants(),
			this.loadRecordings(),
		]).then(() => {
			this.syncSelectedStudy()
		}).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Дані досліджень не завантажено')
		})
	}

	public refreshStudies() {
		return this.api.fetchStudies()
			.then((studies) => {
				this.state.studies = studies
				this.syncSelectedStudy()
				return studies
			})
	}

	public loadParticipants() {
		return this.api.fetchParticipants()
			.then((participants) => {
				this.state.participants = participants
				return participants
			})
	}

	public refreshStudyParticipants() {
		return this.api.fetchStudyParticipants()
			.then((studyParticipants) => {
				this.state.studyParticipants = studyParticipants
				return studyParticipants
			})
	}

	public loadRecordings() {
		return this.api.fetchRecordings({ limit: 1000 })
			.then((recordings) => {
				this.state.recordings = recordings
				return recordings
			})
	}

	public studyParticipantCount(studyId: EntityId) {
		return this.state.studyParticipants.filter((studyParticipant) => studyParticipant.study_id === studyId).length
	}

	public assignedParticipants(studyId: EntityId): AssignedParticipant[] {
		return this.state.studyParticipants
			.filter((assignment) => assignment.study_id === studyId)
			.map((assignment) => {
				const participant = this.state.participants.find((item) => item.id === assignment.participant_id)

				return participant
					? {
						participant,
						assigned_at: assignment.assigned_at,
					}
					: null
			})
			.filter((assignment): assignment is AssignedParticipant => assignment !== null)
	}

	public unassignedParticipants(studyId: EntityId) {
		const assignedParticipantIds = new Set(
			this.state.studyParticipants
				.filter((assignment) => assignment.study_id === studyId)
				.map((assignment) => assignment.participant_id),
		)

		return this.state.participants.filter((participant) => !assignedParticipantIds.has(participant.id))
	}

	public selectStudy(study: Study) {
		this.state.selectedStudy = study
		setSelectedStudyId(study.id)
	}

	public isStudySelected(study: Study) {
		return this.state.selectedStudy?.id === study.id
	}

	public studyDashboardPath(study: Study) {
		return getStudyRoutePath(study)
	}

	public openStudy(study: Study) {
		this.selectStudy(study)
		return navigateTo(this.studyDashboardPath(study))
	}

	public participantInitials(name: string) {
		return getParticipantInitials(name)
	}

	public openCreateStudyModal() {
		this.resetStudyForm()
		this.state.isStudyModalOpen = true
	}

	public openEditStudyModal(study: Study) {
		this.state.editingStudyId = study.id
		this.state.studyForm.title = study.title
		this.state.studyForm.description = study.description
		this.state.studyFormError = ''
		this.state.pageError = ''
		this.state.isStudyModalOpen = true
	}

	public closeStudyModal() {
		this.state.isStudyModalOpen = false
		this.resetStudyForm()
	}

	public saveStudy() {
		if (this.state.studyForm.description.length > STUDY_DESCRIPTION_MAX_LENGTH) {
			this.state.studyFormError = `Опис не може перевищувати ${STUDY_DESCRIPTION_MAX_LENGTH} символів`
			return Promise.resolve()
		}

		const body = {
			title: this.state.studyForm.title,
			description: this.state.studyForm.description,
		}

		this.state.isStudySaving = true
		this.state.studyFormError = ''
		this.state.pageError = ''

		const request = this.state.editingStudyId
			? this.api.updateStudy(this.state.editingStudyId, body).then(() => null)
			: this.api.createStudy(body)

		return request
			.then((createdStudy) => {
				this.closeStudyModal()

				return this.refreshStudies().then(() => createdStudy)
			})
			.then((createdStudy) => {
				if (!createdStudy) {
					return undefined
				}

				const study = this.state.studies.find((item) => item.id === createdStudy.id) ?? createdStudy

				this.selectStudy(study)

				return navigateTo(this.studyDashboardPath(study))
			})
			.then(() => undefined)
			.catch((error) => {
				this.state.studyFormError = getRequestErrorMessage(error, 'Дослідження не збережено')
			})
			.finally(() => {
				this.state.isStudySaving = false
			})
	}

	public deleteStudy(study: Study | EntityId) {
		const studyId = typeof study === 'string' ? study : study.id
		const title = typeof study === 'string'
			? this.state.studies.find((item) => item.id === studyId)?.title
			: study.title

		if (!this.confirmDelete(title ? `Видалити дослідження "${title}"?` : 'Видалити це дослідження?')) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteStudy(studyId).then(() => {
			if (this.state.editingStudyId === studyId) {
				this.resetStudyForm()
			}

			if (this.state.selectedStudy?.id === studyId) {
				this.state.selectedStudy = null
				clearSelectedStudyId()
			}

			return Promise.all([
				this.refreshStudies(),
				this.refreshStudyParticipants(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Дослідження не видалено')
		})
	}

	public openEditParticipantModal(participant: Participant) {
		this.state.editingParticipantId = participant.id
		this.state.participantForm.name = participant.name
		this.state.participantForm.age = participant.age
		this.state.participantForm.sex = participant.sex
		this.state.participantFormError = ''
		this.state.pageError = ''
		this.state.isParticipantModalOpen = true
	}

	public closeParticipantModal() {
		this.state.isParticipantModalOpen = false
		this.resetParticipantForm()
	}

	public saveParticipant() {
		if (!this.state.editingParticipantId) {
			return Promise.resolve()
		}

		const age = Number(this.state.participantForm.age)

		if (!Number.isFinite(age)) {
			this.state.participantFormError = 'Некоректний вік'
			return Promise.resolve()
		}

		this.state.isParticipantSaving = true
		this.state.participantFormError = ''
		this.state.pageError = ''

		return this.api.updateParticipant(this.state.editingParticipantId, {
			name: this.state.participantForm.name,
			age,
			sex: this.state.participantForm.sex,
		}).then(() => {
			this.closeParticipantModal()
			return this.loadParticipants()
		}).then(() => undefined).catch((error) => {
			this.state.participantFormError = getRequestErrorMessage(error, 'Учасника не збережено')
		}).finally(() => {
			this.state.isParticipantSaving = false
		})
	}

	public assignParticipant(studyId: EntityId) {
		const selectedParticipantId = this.state.assignmentForms[studyId]

		if (!selectedParticipantId) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.assignParticipant({
			study_id: studyId,
			participant_id: selectedParticipantId,
		}).then(() => {
			this.state.assignmentForms[studyId] = ''

			return Promise.all([
				this.refreshStudies(),
				this.refreshStudyParticipants(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Учасника не призначено')
		})
	}

	public unassignParticipant(studyId: EntityId, participantId: EntityId) {
		this.state.pageError = ''

		return this.api.unassignParticipant({
			study_id: studyId,
			participant_id: participantId,
		}).then(() => {
			return Promise.all([
				this.refreshStudies(),
				this.refreshStudyParticipants(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Учасника не прибрано з дослідження')
		})
	}

	public studySlug(title: string) {
		return toStudySlug(title)
	}

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
	}

	public formatDateTime(value?: string) {
		return value ? formatDateTimeValue(value) : '-'
	}

	public latestRecordingDate(studyId: EntityId) {
		const latestRecording = this.state.recordings
			.filter((recording) => recording.study_id === studyId)
			.reduce((latest, recording) => {
				if (!recording.time.started_at) {
					return latest
				}

				if (!latest) {
					return recording
				}

				return new Date(recording.time.started_at).getTime() > new Date(latest.time.started_at).getTime()
					? recording
					: latest
			}, null as typeof this.state.recordings[number] | null)

		return latestRecording?.time.started_at
	}

	private resetStudyForm() {
		this.state.editingStudyId = null
		this.state.studyForm.title = ''
		this.state.studyForm.description = ''
		this.state.studyFormError = ''
	}

	private resetParticipantForm() {
		this.state.editingParticipantId = null
		this.state.participantForm.name = ''
		this.state.participantForm.age = ''
		this.state.participantForm.sex = 'male'
		this.state.participantFormError = ''
	}

	private syncSelectedStudy() {
		const selectedStudyId = readSelectedStudyId()
		const selectedStudy = this.state.studies.find((study) => study.id === selectedStudyId) ?? null

		this.state.selectedStudy = selectedStudy

		if (!selectedStudy && selectedStudyId) {
			clearSelectedStudyId()
		}
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
	}
}
