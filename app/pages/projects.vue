<template>
	<section class="projects-page">
		<p v-if="viewModel.state.pageError" class="projects-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<div class="projects-page__grid">
			<article
				v-for="project in viewModel.state.projects"
				:key="project.id"
				class="projects-page__card"
				:class="{ 'projects-page__card_selected': viewModel.isProjectSelected(project) }"
				role="button"
				tabindex="0"
				@click="viewModel.openProject(project)"
				@keydown.enter.prevent="viewModel.openProject(project)"
				@keydown.space.prevent="viewModel.openProject(project)"
			>
				<div class="projects-page__heading">
					<div class="projects-page__heading-row">
						<h2>{{ project.title }}</h2>
						<span v-if="viewModel.isProjectSelected(project)" class="projects-page__active-badge">Активний</span>
					</div>
					<span class="projects-page__project-id">ID {{ project.id }}</span>
					<p class="projects-page__description">{{ project.description }}</p>
				</div>

				<div class="projects-page__assignments">
					<div class="projects-page__section-title">
						<span>Учасники</span>
						<strong>{{ project.users_count ?? viewModel.projectUserCount(project.id) }}</strong>
					</div>

					<div class="projects-page__chips">
						<template v-if="viewModel.assignedUsers(project.id).length">
							<ToolTip
								v-for="assignment in viewModel.assignedUsers(project.id)"
								:key="assignment.user.id"
								class="projects-page__chip-menu"
								placement="left"
								min-width="12em"
								@click.stop
							>
								<template #trigger>
									<span class="projects-page__chip">
										<span class="projects-page__avatar" aria-hidden="true">{{ viewModel.userInitials(assignment.user.name) }}</span>
										<span>{{ assignment.user.name }}</span>
									</span>
								</template>

								<button type="button" @click="viewModel.openEditUserModal(assignment.user)">
									Редагувати користувача
								</button>
								<button type="button" class="tool-tip__menu-danger" @click="viewModel.unassignUser(project.id, assignment.user.id)">
									Прибрати з проєкту
								</button>
							</ToolTip>
						</template>

						<span v-else class="projects-page__empty">Немає призначених користувачів</span>

						<ToolTip
							class="projects-page__assign-panel"
							placement="left"
							min-width="18em"
							aria-label="Призначити користувача"
							@click.stop
						>
							<template #trigger>
								<span class="projects-page__assign-trigger" aria-hidden="true"></span>
							</template>

							<form class="projects-page__assign-form" @submit.prevent="viewModel.assignUser(project.id)">
								<SelectBox
									v-model="viewModel.state.assignmentForms[project.id]"
									:items="viewModel.unassignedUsers(project.id)"
									label-key="name"
									value-key="id"
									:placeholder="viewModel.unassignedUsers(project.id).length === 0 ? 'Усі користувачі призначені' : 'Оберіть користувача'"
									:disabled="viewModel.unassignedUsers(project.id).length === 0"
								/>

								<button
									class="projects-page__button"
									type="submit"
									:disabled="viewModel.unassignedUsers(project.id).length === 0"
								>
									Призначити
								</button>
							</form>
						</ToolTip>
					</div>
				</div>

				<dl class="projects-page__activity">
					<div>
						<dt>Активність</dt>
						<dd>{{ project.recordings_count ?? 0 }} записів</dd>
					</div>
					<div>
						<dt>Створено</dt>
						<dd>{{ viewModel.formatDate(project.created_at) }}</dd>
					</div>
				</dl>

				<div class="projects-page__project-actions" @click.stop>
					<div class="projects-page__project-actions-left">
						<NuxtLink
							class="projects-page__button"
							:to="viewModel.projectDashboardPath(project)"
							@click="viewModel.selectProject(project)"
						>
							Відкрити
						</NuxtLink>
						<button class="projects-page__button" type="button" @click="viewModel.openEditProjectModal(project)">
							Редагувати
						</button>
					</div>
					<button class="projects-page__button projects-page__button_delete" type="button" :aria-label="`Видалити ${project.title}`" @click="viewModel.deleteProject(project)">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
					</button>
				</div>
			</article>

			<button
				class="projects-page__card projects-page__card_add"
				type="button"
				@click="viewModel.openCreateProjectModal()"
			>
				<span class="projects-page__add-icon" aria-hidden="true"></span>
				<span>Створити проєкт</span>
			</button>
		</div>

		<Modal
			:is-open="viewModel.state.isProjectModalOpen"
			:title="viewModel.state.editingProjectId ? 'Редагувати проєкт' : 'Новий проєкт'"
			:submit-label="viewModel.state.editingProjectId ? 'Зберегти зміни' : 'Створити проєкт'"
			:submit-disabled="viewModel.state.isProjectSaving"
			@close="viewModel.closeProjectModal()"
			@submit="viewModel.saveProject()"
		>
			<label>
				<span>Назва</span>
				<input v-model.trim="viewModel.state.projectForm.title" type="text" required />
			</label>

			<label>
				<span>Опис</span>
				<textarea
					v-model.trim="viewModel.state.projectForm.description"
					rows="4"
					:maxlength="PROJECT_DESCRIPTION_MAX_LENGTH"
					required
				></textarea>
			</label>
			<span class="projects-page__field-hint">
				{{ viewModel.state.projectForm.description.length }}/{{ PROJECT_DESCRIPTION_MAX_LENGTH }}
			</span>

			<p v-if="viewModel.state.projectFormError" class="projects-page__form-error">
				{{ viewModel.state.projectFormError }}
			</p>
		</Modal>

		<Modal
			:is-open="viewModel.state.isUserModalOpen"
			title="Редагувати користувача"
			submit-label="Зберегти зміни"
			:submit-disabled="viewModel.state.isUserSaving"
			@close="viewModel.closeUserModal()"
			@submit="viewModel.saveUser()"
		>
			<label>
				<span>Ім'я</span>
				<input v-model.trim="viewModel.state.userForm.name" type="text" required />
			</label>

			<label>
				<span>Вік</span>
				<input v-model.number="viewModel.state.userForm.age" min="0" type="number" required />
			</label>

			<SelectBox v-model="viewModel.state.userForm.sex" label="Стать" :items="sexOptions" />

			<p v-if="viewModel.state.userFormError" class="projects-page__form-error">
				{{ viewModel.state.userFormError }}
			</p>
		</Modal>
	</section>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import ToolTip from '~/components/ToolTip.vue';
import { PROJECT_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { ProjectsPageViewModel } from '~/controllers/pages/ProjectsPageViewModel';

const viewModel = new ProjectsPageViewModel();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

usePageHeader({
	title: 'Проєкти',
	actions: [
		{
			label: 'Створити проєкт',
			variant: 'primary',
			icon: 'project-add',
			onClick: () => viewModel.openCreateProjectModal(),
		},
	],
});

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/projects";
</style>
