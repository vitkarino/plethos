import { reactive } from 'vue'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { ParticipantsPageState } from '~/types/pages/participants'
import type { EntityId, Participant } from '~/types/shared/entities'
import {
	formatDateValue,
	getRequestErrorMessage,
	getSexIcon,
	getSexLabel,
	getParticipantInitials,
	getParticipantStudyTitles,
} from '~/utils/shared'

export class ParticipantsPageViewModel {
	private readonly api = new PulsoApiModel()

	public readonly state = reactive<ParticipantsPageState>({
		participants: [],
		studies: [],
		studyParticipants: [],
		participantForm: {
			name: '',
			age: '',
			sex: 'male',
		},
		editingParticipantId: null,
		isParticipantModalOpen: false,
		isParticipantSaving: false,
		participantFormError: '',
		pageError: '',
	})

	public initialize() {
		return Promise.all([
			this.refreshParticipants(),
			this.loadStudies(),
			this.refreshStudyParticipants(),
		]).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Дані учасників не завантажено')
		})
	}

	public refreshParticipants() {
		return this.api.fetchParticipants()
			.then((participants) => {
				this.state.participants = participants
				return participants
			})
	}

	public loadStudies() {
		return this.api.fetchStudies()
			.then((studies) => {
				this.state.studies = studies
				return studies
			})
	}

	public refreshStudyParticipants() {
		return this.api.fetchStudyParticipants()
			.then((studyParticipants) => {
				this.state.studyParticipants = studyParticipants
				return studyParticipants
			})
	}

	public sexLabel(sex: Participant['sex']) {
		return getSexLabel(sex)
	}

	public sexIcon(sex: Participant['sex']) {
		return getSexIcon(sex)
	}

	public participantInitials(name: string) {
		return getParticipantInitials(name)
	}

	public participantStudyTitlesList(participantId: EntityId) {
		return getParticipantStudyTitles(this.state.studies, this.state.studyParticipants, participantId)
	}

	public participantStudyTitles(participantId: EntityId) {
		const titles = this.participantStudyTitlesList(participantId)
		return titles.length > 0 ? titles.join(', ') : 'Немає досліджень'
	}

	public openCreateParticipantModal() {
		this.resetParticipantForm()
		this.state.isParticipantModalOpen = true
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
		const age = Number(this.state.participantForm.age)

		if (!Number.isFinite(age)) {
			this.state.participantFormError = 'Некоректний вік'
			return Promise.resolve()
		}

		const body = {
			name: this.state.participantForm.name,
			age,
			sex: this.state.participantForm.sex,
		}

		this.state.isParticipantSaving = true
		this.state.participantFormError = ''
		this.state.pageError = ''

		const request = this.state.editingParticipantId
			? this.api.updateParticipant(this.state.editingParticipantId, body).then(() => undefined)
			: this.api.createParticipant(body).then(() => undefined)

		return request
			.then(() => {
				this.closeParticipantModal()
				return this.refreshParticipants()
			})
			.then(() => undefined)
			.catch((error) => {
				this.state.participantFormError = getRequestErrorMessage(error, 'Учасника не збережено')
			})
			.finally(() => {
				this.state.isParticipantSaving = false
			})
	}

	public deleteParticipant(participant: Participant | EntityId) {
		const participantId = typeof participant === 'string' ? participant : participant.id
		const name = typeof participant === 'string'
			? this.state.participants.find((item) => item.id === participantId)?.name
			: participant.name

		if (!this.confirmDelete(name ? `Видалити учасника "${name}"?` : 'Видалити цього учасника?')) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteParticipant(participantId).then(() => {
			if (this.state.editingParticipantId === participantId) {
				this.resetParticipantForm()
			}

			return Promise.all([
				this.refreshParticipants(),
				this.refreshStudyParticipants(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Учасника не видалено')
		})
	}

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
	}

	private resetParticipantForm() {
		this.state.editingParticipantId = null
		this.state.participantForm.name = ''
		this.state.participantForm.age = ''
		this.state.participantForm.sex = 'male'
		this.state.participantFormError = ''
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
	}
}
