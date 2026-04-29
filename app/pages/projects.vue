<template>
	<section class="projects-page">
		<Block class="projects-page__panel">
			<template #header>
				<div class="block-header-data">Активні проєкти</div>
			</template>

			<p v-if="viewModel.state.pageError" class="projects-page__form-error">
				{{ viewModel.state.pageError }}
			</p>

			<div class="projects-page__toolbar">
				<button
					class="projects-page__button projects-page__button_primary"
					type="button"
					@click="viewModel.openCreateProjectModal()"
				>
					Створити проєкт
				</button>
			</div>

			<p v-if="!viewModel.state.projects.length" class="projects-page__empty">
				Проєктів ще немає
			</p>

			<div v-if="viewModel.state.projects.length" class="projects-page__grid">
				<Block
					v-for="project in viewModel.state.projects"
					:key="project.id"
					class="projects-page__project"
				>
					<div class="projects-page__project-header">
						<div>
							<h2>{{ project.title }}</h2>
						</div>
					</div>

					<p class="projects-page__description">{{ project.description }}</p>

					<div class="projects-page__assignments">
						<div class="projects-page__section-title">
							<span>Користувачі</span>
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

					<p class="projects-page__meta">
						Створено {{ viewModel.formatDate(project.created_at) }} · Оновлено {{ viewModel.formatDate(project.updated_at) }}
					</p>

					<div class="projects-page__project-actions">
						<NuxtLink
							class="projects-page__button projects-page__button_primary"
							:to="viewModel.projectDashboardPath(project)"
							@click.stop="viewModel.selectProject(project)"
						>
							Відкрити
						</NuxtLink>
						<ToolTip class="projects-page__menu" aria-label="Дії з проєктом" @click.stop>
							<button type="button" @click="viewModel.openEditProjectModal(project)">
								Редагувати
							</button>
							<button type="button" class="tool-tip__menu-danger" @click="viewModel.deleteProject(project)">
								Видалити
							</button>
						</ToolTip>
					</div>
				</Block>
			</div>

			<template #footer>
				<div class="block-footer-data">
					<span class="block-footer-data__item">
						<span class="block-footer-data__label">Проєктів:</span>
						<span class="block-footer-data__value">{{ viewModel.state.projects.length }}</span>
					</span>
				</div>
			</template>
		</Block>

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
import Block from '~/components/Block.vue';
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import ToolTip from '~/components/ToolTip.vue';
import { PROJECT_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { ProjectsPageViewModel } from '~/controllers/pages/ProjectsPageViewModel';

const viewModel = new ProjectsPageViewModel();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
];

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/projects";
</style>
