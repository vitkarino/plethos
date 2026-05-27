<template>
	<section class="studies-page studies-page_panel">
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
						<template v-if="viewModel.assignedParticipants(study.id).length">
							<details
								v-for="assignment in viewModel.assignedParticipants(study.id)"
								:key="assignment.participant.id"
								class="studies-page__native-menu studies-page__chip-menu"
								@click.stop
							>
								<summary class="studies-page__menu-summary">
									<span class="studies-page__chip">
										<span class="studies-page__avatar" aria-hidden="true">{{ viewModel.participantInitials(assignment.participant.name) }}</span>
										<span>{{ assignment.participant.name }}</span>
									</span>
								</summary>

								<div class="studies-page__menu studies-page__menu_chip">
									<button type="button" @click="viewModel.openEditParticipantModal(assignment.participant)">
										Редагувати учасника
									</button>
									<button type="button" class="studies-page__menu-danger" @click="viewModel.unassignParticipant(study.id, assignment.participant.id)">
										Прибрати з дослідження
									</button>
								</div>
							</details>
						</template>

						<span v-else class="studies-page__empty">Немає призначених учасників</span>

						<details
							class="studies-page__native-menu studies-page__assign-panel"
							@click.stop
						>
							<summary class="studies-page__menu-summary" aria-label="Призначити учасника">
								<span class="studies-page__assign-trigger" aria-hidden="true"></span>
							</summary>

							<div class="studies-page__menu studies-page__menu_assign">
								<form class="studies-page__assign-form" @submit.prevent="viewModel.assignParticipant(study.id)">
									<SelectBox
										v-model="viewModel.state.assignmentForms[study.id]"
										:items="viewModel.unassignedParticipants(study.id)"
										label-key="name"
										value-key="id"
										:placeholder="viewModel.unassignedParticipants(study.id).length === 0 ? 'Усі учасники призначені' : 'Оберіть учасника'"
										:disabled="viewModel.unassignedParticipants(study.id).length === 0"
									/>

									<button
										class="studies-page__button"
										type="submit"
										:disabled="viewModel.unassignedParticipants(study.id).length === 0"
									>
										Призначити
									</button>
								</form>
							</div>
						</details>
					</div>
				</div>

				<dl class="studies-page__activity">
					<div>
						<dt>Записи</dt>
						<dd>{{ study.recordings_count ?? 0 }} записів</dd>
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

		<Modal
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
		</Modal>

		<Modal
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

			<SelectBox v-model="viewModel.state.participantForm.sex" label="Стать" :items="sexOptions" />

			<p v-if="viewModel.state.participantFormError" class="studies-page__form-error">
				{{ viewModel.state.participantFormError }}
			</p>
		</Modal>
	</section>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import { STUDY_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { StudiesPageViewModel } from '~/controllers/pages/StudiesPageViewModel';

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

defineExpose({
	openCreateStudyModal,
	reload,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/studies";
@use "~/assets/styles/scss/core/variables" as *;

.studies-page_panel {
	height: auto;
	min-height: 100%;
}

.studies-page_panel .studies-page__grid {
	grid-template-columns: repeat(auto-fit, minmax(22em, 1fr));
	gap: 0.875em;
}

.studies-page_panel .studies-page__card {
	min-height: 0;
	padding: 1em;
}

.studies-page_panel .studies-page__card:hover,
.studies-page_panel .studies-page__card:focus-visible,
.studies-page_panel .studies-page__card:focus-within {
	transform: none;
}

.studies-page_panel .studies-page__study-actions,
.studies-page_panel .studies-page__study-actions-left {
	flex-wrap: wrap;
}
</style>
