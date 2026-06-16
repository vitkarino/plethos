import { reactive } from 'vue'
import { ApiModel } from '~/models/ApiModel'
import type { StudyDashboardPageState } from '~/types/pages/study-dashboard'
import type { Participant } from '~/types/shared/entities'
import {
	findStudyByRouteName,
	formatDateValue,
	getRequestErrorMessage,
	getSexLabel,
	setSelectedStudyId,
} from '~/utils/shared'

export class StudyDashboardPageViewModel {
	private readonly api = new ApiModel()

	public readonly state = reactive<StudyDashboardPageState>({
		studyName: '',
		studies: [],
		participants: [],
		studyParticipants: [],
		study: null,
		assignedParticipants: [],
		isLoading: true,
		pageError: '',
	})

	public constructor(studyName: string) {
		this.state.studyName = studyName
	}

	public initialize() {
		this.state.isLoading = true
		this.state.pageError = ''

		return Promise.all([
			this.loadStudies(),
			this.loadParticipants(),
			this.loadStudyParticipants(),
		]).then(() => {
			this.syncStudyState()
		}).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Дашборд дослідження не завантажено')
		}).finally(() => {
			this.state.isLoading = false
		})
	}

	public sexLabel(sex: Participant['sex']) {
		return getSexLabel(sex)
	}

	public formatDate(value?: string) {
		return value ? formatDateValue(value) : '-'
	}

	private loadStudies() {
		return this.api.fetchStudies()
			.then((studies) => {
				this.state.studies = studies
				return studies
			})
	}

	private loadParticipants() {
		return this.api.fetchParticipants({
			study_id: this.state.study?.id,
			limit: 100,
		})
			.then((participants) => {
				this.state.participants = participants
				return participants
			})
	}

	private loadStudyParticipants() {
		return this.api.fetchStudyParticipants()
			.then((studyParticipants) => {
				this.state.studyParticipants = studyParticipants
				return studyParticipants
			})
	}

	private syncStudyState() {
		this.state.study = findStudyByRouteName(this.state.studies, this.state.studyName)

		if (!this.state.study) {
			this.state.assignedParticipants = []
			this.state.pageError = 'Дослідження не знайдено'
			return
		}

		setSelectedStudyId(this.state.study.id)

		this.api.fetchParticipants({
			study_id: this.state.study.id,
			limit: 100,
		}).then((participants) => {
			this.state.participants = participants
			this.state.assignedParticipants = participants.map((participant) => {
				return {
					participant,
					assigned_at: participant.created_at,
				}
			})
		})
	}
}
