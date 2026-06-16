import { reactive } from 'vue'
import { STUDY_DESCRIPTION_MAX_LENGTH } from '~/constants/forms'
import { ApiModel as ApiModel } from '~/models/ApiModel'
import type { DefaultLayoutState, SidebarPanelKey } from '~/types/layouts/default'
import type { EntityId, Study, Participant } from '~/types/shared/entities'
import {
	clearSelectedStudyId,
	findStudyByRouteName,
	formatDateValue,
	getStudyRoutePath,
	getRequestErrorMessage,
	getSexIcon,
	getSexLabel,
	getParticipantInitials,
	getParticipantStudyTitles,
	readSelectedStudyId,
	setSelectedStudyId,
	toStudySlug,
} from '~/utils/shared'

export class DefaultLayoutViewModel {
	private readonly api = new ApiModel()

	public readonly state = reactive<DefaultLayoutState>({
		studies: [],
		selectedStudy: null,
		participants: [],
		studyParticipants: [],
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
		activeSidebarPanel: null,
		isStudySaving: false,
		isParticipantSaving: false,
		studyFormError: '',
		participantFormError: '',
		pageError: '',
	})

	public initialize(routeStudyName: unknown = '') {
		return this.refreshPreviewData().catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Дані перегляду не завантажено')
		}).finally(() => {
			this.syncSelectedStudyByRouteParam(routeStudyName)
		})
	}

	public refreshPreviewData() {
		return Promise.all([
			this.refreshStudies(),
			this.refreshParticipants(),
			this.refreshStudyParticipants(),
		]).then(() => undefined)
	}

	public refreshStudies() {
		return this.api.fetchStudies()
			.then((studies) => {
				this.state.studies = studies
				this.syncSelectedStudy()
				return studies
			})
	}

	public refreshParticipants() {
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

	public studyParticipantCount(studyId: EntityId) {
		const study = this.state.studies.find((item) => item.id === studyId)

		return study?.participants_count ?? this.state.studyParticipants.filter((studyParticipant) => studyParticipant.study_id === studyId).length
	}

	public syncSelectedStudy(studyName = '') {
		const routeStudy = studyName ? findStudyByRouteName(this.state.studies, studyName) : null

		if (routeStudy) {
			this.selectStudy(routeStudy)
			return
		}

		const selectedStudyId = readSelectedStudyId()
		const selectedStudy = this.state.studies.find((study) => study.id === selectedStudyId) ?? null

		this.state.selectedStudy = selectedStudy

		if (!selectedStudy && selectedStudyId) {
			clearSelectedStudyId()
		}
	}

	public syncSelectedStudyByRouteParam(value: unknown) {
		this.syncSelectedStudy(this.getRouteStudyName(value))
	}

	public selectStudy(study: Study) {
		this.state.selectedStudy = study
		setSelectedStudyId(study.id)
	}

	public exitCurrentStudy() {
		if (!this.confirmExitStudy()) {
			return Promise.resolve()
		}

		this.state.selectedStudy = null
		clearSelectedStudyId()
		this.state.pageError = ''
		this.openSidebarPanel('studies')

		return navigateTo('/')
	}

	public selectStudyById(studyId: EntityId | number | null) {
		const id = String(studyId ?? '')
		const study = this.state.studies.find((item) => item.id === id) ?? null

		if (study) {
			this.selectStudy(study)
		}

		return study
	}

	public switchToStudy(study: Study) {
		this.selectStudy(study)
	}

	public isStudySelected(study: Study) {
		return this.state.selectedStudy?.id === study.id
	}

	public studyDashboardPath(study: Study) {
		return getStudyRoutePath(study)
	}

	public selectedStudyDashboardPath() {
		return this.state.selectedStudy ? getStudyRoutePath(this.state.selectedStudy) : '/'
	}

	public selectedStudyLabel() {
		return this.state.selectedStudy?.title ?? ''
	}

	public toggleSidebarPanel(panel: SidebarPanelKey) {
		this.state.activeSidebarPanel = this.state.activeSidebarPanel === panel ? null : panel
	}

	public openSidebarPanel(panel: SidebarPanelKey) {
		this.state.activeSidebarPanel = panel
	}

	public closeSidebarPanel() {
		this.state.activeSidebarPanel = null
	}

	public syncSidebarPanelFromPath(path: string) {
		const panel = this.sidebarPanelFromPath(path)

		if (panel) {
			this.openSidebarPanel(panel)
		}
	}

	public participantStudyTitles(participantId: EntityId) {
		const titles = this.participantStudyTitlesList(participantId)
		return titles.length > 0 ? titles.join(', ') : 'Немає досліджень'
	}

	public participantStudyTitlesList(participantId: EntityId) {
		return getParticipantStudyTitles(this.state.studies, this.state.studyParticipants, participantId)
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
		if (!this.state.editingStudyId) {
			return Promise.resolve()
		}

		if (this.state.studyForm.description.length > STUDY_DESCRIPTION_MAX_LENGTH) {
			this.state.studyFormError = `Опис не може перевищувати ${STUDY_DESCRIPTION_MAX_LENGTH} символів`
			return Promise.resolve()
		}

		this.state.isStudySaving = true
		this.state.studyFormError = ''
		this.state.pageError = ''

		return this.api.updateStudy(this.state.editingStudyId, {
			title: this.state.studyForm.title,
			description: this.state.studyForm.description,
		}).then(() => {
			this.closeStudyModal()
			return this.refreshStudies()
		}).then(() => undefined).catch((error) => {
			this.state.studyFormError = getRequestErrorMessage(error, 'Дослідження не збережено')
		}).finally(() => {
			this.state.isStudySaving = false
		})
	}

	public deleteStudy(study: Study) {
		if (!this.confirmDelete(`Видалити дослідження "${study.title}"?`)) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteStudy(study.id).then(() => {
			if (this.state.editingStudyId === study.id) {
				this.resetStudyForm()
			}

			if (this.state.selectedStudy?.id === study.id) {
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
			return this.refreshParticipants()
		}).then(() => undefined).catch((error) => {
			this.state.participantFormError = getRequestErrorMessage(error, 'Учасника не збережено')
		}).finally(() => {
			this.state.isParticipantSaving = false
		})
	}

	public deleteParticipant(participant: Participant) {
		if (!this.confirmDelete(`Видалити учасника "${participant.name}"?`)) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteParticipant(participant.id).then(() => {
			if (this.state.editingParticipantId === participant.id) {
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

	public studySlug(title: string) {
		return toStudySlug(title)
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

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
	}

	private confirmExitStudy() {
		return typeof window === 'undefined' || window.confirm('Завершити роботу?')
	}

	private getRouteStudyName(value: unknown) {
		if (Array.isArray(value)) {
			return value[0] ?? ''
		}

		return typeof value === 'string' ? value : ''
	}

	private sidebarPanelFromPath(path: string): SidebarPanelKey | null {
		return null
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
}
