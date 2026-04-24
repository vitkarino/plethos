<template>
	<div class="app-layout">
		<Sidebar>
			<template #top>
				<div class="app-layout__logo">
					<img :src="pulsoLogo" alt="Pulso" />
				</div>
			</template>

			<template #nav>
				<div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_home"
						data-shortcut="Ctrl + 1"
						:to="viewModel.workPath('/dashboard')"
					>
						Головна
					</NuxtLink>
				</div>

				<div class="app-layout__nav-item app-layout__nav-item_preview">
					<NuxtLink class="app-layout__link app-layout__link_projects" data-shortcut="Ctrl + 2" to="/projects">
						<span>Проєкти</span>
						<small v-if="viewModel.state.selectedProject" class="app-layout__link-meta">
							{{ viewModel.selectedProjectLabel() }}
						</small>
					</NuxtLink>

					<div class="app-layout__preview">
						<div class="app-layout__preview-header">
							<strong>Проєкти</strong>
							<span>{{ viewModel.state.projects.length }}</span>
						</div>

						<p v-if="viewModel.state.pageError" class="app-layout__preview-error">
							{{ viewModel.state.pageError }}
						</p>

						<div v-if="viewModel.state.projects.length" class="app-layout__preview-list">
							<div
								v-for="project in viewModel.state.projects"
								:key="project.id"
								class="app-layout__preview-item"
								:class="{ 'app-layout__preview-item_selected': viewModel.isProjectSelected(project) }"
							>
								<NuxtLink
									class="app-layout__preview-main"
									:to="viewModel.projectDashboardPath(project)"
									@click="viewModel.selectProject(project)"
								>
									<strong>{{ project.title }}</strong>
									<small>{{ viewModel.projectUserCount(project.id) }} users · {{ viewModel.formatDate(project.updated_at) }}</small>
								</NuxtLink>

								<div class="app-layout__preview-actions">
									<button
										class="app-layout__icon-button app-layout__icon-button_edit"
										type="button"
										title="Edit project"
										aria-label="Edit project"
										@click="viewModel.openEditProjectModal(project)"
									></button>
									<button
										class="app-layout__icon-button app-layout__icon-button_delete"
										type="button"
										title="Delete project"
										aria-label="Delete project"
										@click="viewModel.deleteProject(project)"
									></button>
								</div>
							</div>
						</div>

						<p v-else class="app-layout__preview-empty">No projects</p>
					</div>
				</div>

				<div class="app-layout__nav-item app-layout__nav-item_preview">
					<NuxtLink
						class="app-layout__link app-layout__link_users"
						data-shortcut="Ctrl + 3"
						:to="viewModel.workPath('/users')"
					>
						Користувачі
					</NuxtLink>

					<div class="app-layout__preview">
						<div class="app-layout__preview-header">
							<strong>Користувачі</strong>
							<span>{{ viewModel.state.users.length }}</span>
						</div>

						<p v-if="viewModel.state.pageError" class="app-layout__preview-error">
							{{ viewModel.state.pageError }}
						</p>

						<div v-if="viewModel.state.users.length" class="app-layout__preview-list">
							<div
								v-for="user in viewModel.state.users"
								:key="user.id"
								class="app-layout__preview-item"
							>
								<NuxtLink class="app-layout__preview-main" :to="viewModel.workPath('/users')">
									<strong>{{ user.name }}</strong>
									<small>{{ viewModel.sexLabel(user.sex) }}, {{ user.age }} · {{ viewModel.userProjectTitles(user.id) }}</small>
								</NuxtLink>

								<div class="app-layout__preview-actions">
									<button
										class="app-layout__icon-button app-layout__icon-button_edit"
										type="button"
										title="Edit user"
										aria-label="Edit user"
										@click="viewModel.openEditUserModal(user)"
									></button>
									<button
										class="app-layout__icon-button app-layout__icon-button_delete"
										type="button"
										title="Delete user"
										aria-label="Delete user"
										@click="viewModel.deleteUser(user)"
									></button>
								</div>
							</div>
						</div>

						<p v-else class="app-layout__preview-empty">No users</p>
					</div>
				</div>

				<div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_chat"
						data-shortcut="Ctrl + 4"
						:to="viewModel.workPath('/ai')"
					>
						ШІ Чат
					</NuxtLink>
				</div>

				<div class="app-layout__nav-item">
					<a class="app-layout__link app-layout__link_signals" data-shortcut="Ctrl + 5" href="#">Редактор сигналів</a>
				</div>
			</template>

			<template #bottom>
				<a class="app-layout__link app-layout__link_author" href="https://github.com/vitkarino/pulso.git" target="_blank">GitHub</a>
			</template>
		</Sidebar>

		<main class="app-layout__content">
			<slot />
		</main>

		<Modal
			:is-open="viewModel.state.isProjectModalOpen"
			title="Edit project"
			submit-label="Save changes"
			:submit-disabled="viewModel.state.isProjectSaving"
			@close="viewModel.closeProjectModal()"
			@submit="viewModel.saveProject()"
		>
			<label>
				<span>Title</span>
				<input v-model.trim="viewModel.state.projectForm.title" type="text" required />
			</label>

			<label>
				<span>Description</span>
				<textarea v-model.trim="viewModel.state.projectForm.description" rows="4" required></textarea>
			</label>

			<p v-if="viewModel.state.projectFormError" class="app-layout__form-error">
				{{ viewModel.state.projectFormError }}
			</p>
		</Modal>

		<Modal
			:is-open="viewModel.state.isUserModalOpen"
			title="Edit user"
			submit-label="Save changes"
			:submit-disabled="viewModel.state.isUserSaving"
			@close="viewModel.closeUserModal()"
			@submit="viewModel.saveUser()"
		>
			<label>
				<span>Name</span>
				<input v-model.trim="viewModel.state.userForm.name" type="text" required />
			</label>

			<label>
				<span>Age</span>
				<input v-model.number="viewModel.state.userForm.age" min="0" type="number" required />
			</label>

			<label>
				<span>Sex</span>
				<select v-model="viewModel.state.userForm.sex">
					<option value="male">Male</option>
					<option value="female">Female</option>
				</select>
			</label>

			<p v-if="viewModel.state.userFormError" class="app-layout__form-error">
				{{ viewModel.state.userFormError }}
			</p>
		</Modal>
	</div>
</template>

<script setup lang="ts">
import pulsoLogo from '~/assets/images/pulso_logo.svg';
import Modal from '~/components/Modal.vue';
import Sidebar from '~/components/Sidebar.vue';
import { DefaultLayoutViewModel } from '~/controllers/layouts/DefaultLayoutViewModel';

const viewModel = new DefaultLayoutViewModel();
const route = useRoute();

viewModel.initialize(route.params.name);

watch(
	() => route.params.name,
	(value) => viewModel.syncSelectedProjectByRouteParam(value),
);

onMounted(() => {
	viewModel.mountShortcutListeners();
});

onBeforeUnmount(() => {
	viewModel.destroyShortcutListeners();
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/layouts/default";
</style>
