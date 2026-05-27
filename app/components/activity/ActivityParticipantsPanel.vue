<template>
	<section class="participants-page participants-page_panel">
		<p v-if="viewModel.state.pageError" class="participants-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<div class="participants-page__grid">
			<article
				v-for="participant in viewModel.state.participants"
				:key="participant.id"
				class="participants-page__card"
			>
				<div class="participants-page__identity">
					<span class="participants-page__avatar" aria-hidden="true">{{ viewModel.participantInitials(participant.name) }}</span>
					<div class="participants-page__identity-text">
						<h2>{{ participant.name }}</h2>
						<div class="participants-page__details">
							<span>{{ participant.age }} років</span>
							<span v-if="participant.sex === 'other' || participant.sex === null">Інше</span>
							<span v-else class="participants-page__sex" :aria-label="viewModel.sexLabel(participant.sex)">
								{{ viewModel.sexIcon(participant.sex) }}
							</span>
						</div>
					</div>
				</div>

				<div class="participants-page__studies">
					<span class="participants-page__section-label">Дослідження</span>
					<div class="participants-page__chips">
						<template v-if="viewModel.participantStudyTitlesList(participant.id).length">
							<span
								v-for="title in viewModel.participantStudyTitlesList(participant.id).slice(0, 3)"
								:key="title"
								class="participants-page__chip"
							>
								{{ title }}
							</span>
							<span v-if="viewModel.participantStudyTitlesList(participant.id).length > 3" class="participants-page__chip participants-page__chip_more">
								+{{ viewModel.participantStudyTitlesList(participant.id).length - 3 }}
							</span>
						</template>
						<span v-else class="participants-page__empty">Немає досліджень</span>
					</div>
				</div>

				<div class="participants-page__actions" @click.stop>
					<button class="participants-page__button" type="button" :aria-label="`Редагувати ${participant.name}`" @click="viewModel.openEditParticipantModal(participant)">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
					</button>
					<button class="participants-page__button participants-page__button_delete" type="button" :aria-label="`Видалити ${participant.name}`" @click="viewModel.deleteParticipant(participant)">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
					</button>
				</div>
			</article>

		</div>

		<Modal
			:is-open="viewModel.state.isParticipantModalOpen"
			:title="viewModel.state.editingParticipantId ? 'Редагувати учасника' : 'Новий учасник'"
			:submit-label="viewModel.state.editingParticipantId ? 'Зберегти зміни' : 'Створити учасника'"
			:submit-disabled="viewModel.state.isParticipantSaving"
			width="30em"
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

			<p v-if="viewModel.state.participantFormError" class="participants-page__form-error">
				{{ viewModel.state.participantFormError }}
			</p>
		</Modal>
	</section>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import { ParticipantsPageViewModel } from '~/controllers/pages/ParticipantsPageViewModel';

const viewModel = new ParticipantsPageViewModel();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

viewModel.initialize();

function reload() {
	void viewModel.initialize();
}

function openCreateParticipantModal() {
	viewModel.openCreateParticipantModal();
}

defineExpose({
	reload,
	openCreateParticipantModal,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/participants";
@use "~/assets/styles/scss/core/variables" as *;

.participants-page_panel {
	width: 100%;
	height: auto;
	min-height: 100%;
}

.participants-page_panel .participants-page__grid {
	grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
	gap: 0.875em;
}

.participants-page_panel .participants-page__card:hover,
.participants-page_panel .participants-page__card:focus-visible,
.participants-page_panel .participants-page__card:focus-within {
	transform: none;
}
</style>
