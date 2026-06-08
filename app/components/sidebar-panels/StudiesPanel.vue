<template>
	<Panel content-class="studies-page">
		<p v-if="viewModel.state.pageError" class="studies-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<div class="studies-page__grid">
			<article
				v-for="study in viewModel.state.studies"
				:key="study.id"
				class="studies-page__card"
				:class="{ 'studies-page__card_selected': viewModel.isStudySelected(study) }"
			>
				<div class="studies-page__heading">
					<div class="studies-page__heading-row">
						<h2>{{ study.title }}</h2>
					</div>
					<span v-if="viewModel.isStudySelected(study)" class="studies-page__active-badge">Активний</span>
					<p class="studies-page__description">{{ study.description }}</p>
				</div>

				<div class="studies-page__assignments">
					<div class="studies-page__section-title">
						<span>Учасники</span>
					</div>

					<div class="studies-page__chips">
						<label
							v-for="assignment in viewModel.assignedParticipants(study.id)"
							:key="assignment.participant.id"
							class="studies-page__chip-select"
							:aria-label="`Дії для ${assignment.participant.name}`"
							@click.stop
						>
							<span class="studies-page__chip">
								<span class="studies-page__avatar" aria-hidden="true">{{ viewModel.participantInitials(assignment.participant.name) }}</span>
								<span>{{ assignment.participant.name }}</span>
							</span>
							<select
								class="studies-page__chip-native-select"
								@change="handleParticipantChipAction(study.id, assignment, $event)"
							>
								<option value="" selected disabled>
									{{ assignment.participant.name }}
								</option>
								<option value="edit">Редагувати учасника</option>
								<option value="unassign">Прибрати з дослідження</option>
							</select>
						</label>

						<label
							v-if="viewModel.unassignedParticipants(study.id).length"
							class="studies-page__assign-select"
							:aria-label="`Призначити учасника до ${study.title}`"
							@click.stop
						>
							<span class="studies-page__assign-trigger" aria-hidden="true"></span>
							<select
								class="studies-page__assign-native-select"
								:value="viewModel.state.assignmentForms[study.id] || ''"
								@change="handleAssignParticipant(study.id, $event)"
							>
								<option value="" disabled>
									Оберіть учасника
								</option>
								<option
									v-for="participant in viewModel.unassignedParticipants(study.id)"
									:key="participant.id"
									:value="participant.id"
								>
									{{ participant.name }}
								</option>
							</select>
						</label>
						<span
							v-else
							class="studies-page__assign-trigger studies-page__assign-trigger_disabled"
							aria-hidden="true"
							title="Усі учасники призначені"
						></span>
					</div>
				</div>

				<dl class="studies-page__activity">
					<div>
						<dt>Записів</dt>
						<dd>{{ study.recordings_count ?? 0 }}</dd>
					</div>
					<div>
						<dt>Створено</dt>
						<dd>{{ viewModel.formatDateTime(study.created_at) }}</dd>
					</div>
					<div>
						<dt>Останнє оновлення</dt>
						<dd>{{ viewModel.formatDateTime(viewModel.latestRecordingDate(study.id)) }}</dd>
					</div>
				</dl>

				<div class="studies-page__study-actions" @click.stop>
					<div class="studies-page__study-actions-left">
						<NuxtLink
							v-if="!viewModel.isStudySelected(study)"
							class="studies-page__button studies-page__button_open"
							:to="viewModel.studyDashboardPath(study)"
							@click="selectStudy(study)"
						>
							Відкрити
						</NuxtLink>
						<button class="studies-page__button studies-page__button_icon" type="button" :aria-label="`Редагувати ${study.title}`" @click="viewModel.openEditStudyModal(study)">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
						</button>
					</div>
					<button class="studies-page__button studies-page__button_delete" type="button" :aria-label="`Видалити ${study.title}`" @click="viewModel.deleteStudy(study)">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
					</button>
				</div>
			</article>

		</div>

		<AppDialog
			:is-open="viewModel.state.isStudyModalOpen"
			:title="viewModel.state.editingStudyId ? 'Редагувати дослідження' : 'Нове дослідження'"
			:submit-label="viewModel.state.editingStudyId ? 'Зберегти зміни' : 'Створити дослідження'"
			:submit-disabled="viewModel.state.isStudySaving"
			@close="viewModel.closeStudyModal()"
			@submit="viewModel.saveStudy()"
		>
			<label>
				<span>Назва</span>
				<input v-model.trim="viewModel.state.studyForm.title" type="text" required />
			</label>

			<label>
				<span>Опис</span>
				<textarea
					v-model.trim="viewModel.state.studyForm.description"
					rows="4"
					:maxlength="STUDY_DESCRIPTION_MAX_LENGTH"
					required
				></textarea>
			</label>
			<span class="studies-page__field-hint">
				{{ viewModel.state.studyForm.description.length }}/{{ STUDY_DESCRIPTION_MAX_LENGTH }}
			</span>

			<p v-if="viewModel.state.studyFormError" class="studies-page__form-error">
				{{ viewModel.state.studyFormError }}
			</p>
		</AppDialog>

		<AppDialog
			:is-open="viewModel.state.isParticipantModalOpen"
			title="Редагувати учасника"
			submit-label="Зберегти зміни"
			:submit-disabled="viewModel.state.isParticipantSaving"
			@close="viewModel.closeParticipantModal()"
			@submit="viewModel.saveParticipant()"
		>
			<label>
				<span>Ім'я</span>
				<input v-model.trim="viewModel.state.participantForm.name" type="text" required />
			</label>

			<label>
				<span>Вік</span>
				<input v-model.number="viewModel.state.participantForm.age" min="0" type="number" required />
			</label>

			<label class="native-field">
				<span class="native-field__label">Стать</span>
				<select v-model="viewModel.state.participantForm.sex" class="native-field__select" required>
					<option v-for="option in sexOptions" :key="option.value" :value="option.value">
						{{ option.label }}
					</option>
				</select>
			</label>

			<p v-if="viewModel.state.participantFormError" class="studies-page__form-error">
				{{ viewModel.state.participantFormError }}
			</p>
		</AppDialog>
	</Panel>
</template>

<script setup lang="ts">
import AppDialog from '~/components/AppDialog.vue';
import Panel from '~/components/Panel.vue';
import { STUDY_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { StudiesPageViewModel } from '~/controllers/pages/StudiesPageViewModel';
import type { AssignedParticipant, EntityId } from '~/types/shared/entities';

const viewModel = new StudiesPageViewModel();
const emit = defineEmits<{
	select: []
}>();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

viewModel.initialize();

function reload() {
	void viewModel.initialize();
}

function selectStudy(study: Parameters<typeof viewModel.selectStudy>[0]) {
	emit('select');
	viewModel.selectStudy(study);
}

function openCreateStudyModal() {
	viewModel.openCreateStudyModal();
}

function handleParticipantChipAction(studyId: EntityId, assignment: AssignedParticipant, event: Event) {
	const select = event.target as HTMLSelectElement;
	const action = select.value;

	select.value = '';

	if (action === 'edit') {
		viewModel.openEditParticipantModal(assignment.participant);
		return;
	}

	if (action === 'unassign') {
		void viewModel.unassignParticipant(studyId, assignment.participant.id);
	}
}

function handleAssignParticipant(studyId: EntityId, event: Event) {
	const select = event.target as HTMLSelectElement;
	const participantId = select.value;

	if (!participantId) {
		return;
	}

	viewModel.state.assignmentForms[studyId] = participantId;

	void viewModel.assignParticipant(studyId).finally(() => {
		select.value = '';
	});
}

defineExpose({
	openCreateStudyModal,
	reload,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/NativeField";
@use "~/assets/styles/scss/pages/studies";
</style>
