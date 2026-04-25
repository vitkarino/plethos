<template>
	<div
		class="app-layout"
		:class="{ 'app-layout_modal-open': viewModel.state.isProjectModalOpen || viewModel.state.isUserModalOpen }"
	>
		<Sidebar>
			<template #top>
				<div class="app-layout__logo">
					<img :src="pulsoLogo" alt="Pulso" />
				</div>
			</template>

			<template #nav>
				<div v-if="viewModel.state.selectedProject" class="app-layout__project-info">
					<span>Поточний проєкт</span>
					<strong>{{ viewModel.selectedProjectLabel() }}</strong>
				</div>

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
						Проєкти
					</NuxtLink>

					<PreviewToolTip
						title="Проєкти"
						:count="viewModel.state.projects.length"
						:error="viewModel.state.pageError"
						:has-items="viewModel.state.projects.length > 0"
						empty-label="No projects"
					>
						<ToolTip
							v-for="project in viewModel.state.projects"
							:key="project.id"
							class="preview-tool-tip__item"
							:class="{ 'preview-tool-tip__item_selected': viewModel.isProjectSelected(project) }"
							trigger-class="preview-tool-tip__summary"
						>
							<template #trigger>
								<span class="preview-tool-tip__main">
									<strong>{{ project.title }}</strong>
									<small>{{ viewModel.projectUserCount(project.id) }} users · {{ viewModel.formatDate(project.updated_at) }}</small>
								</span>
								<span class="tool-tip__icon-button" aria-hidden="true"></span>
							</template>

							<button type="button" @click="viewModel.switchToProject(project)">
								Switch to this project
							</button>
							<button type="button" @click="viewModel.openEditProjectModal(project)">
								Edit
							</button>
							<button type="button" class="tool-tip__menu-danger" @click="viewModel.deleteProject(project)">
								Delete
							</button>
						</ToolTip>
					</PreviewToolTip>
				</div>

				<div class="app-layout__nav-item app-layout__nav-item_preview">
					<NuxtLink
						class="app-layout__link app-layout__link_users"
						data-shortcut="Ctrl + 3"
						:to="viewModel.workPath('/users')"
					>
						Користувачі
					</NuxtLink>

					<PreviewToolTip
						title="Користувачі"
						:count="viewModel.state.users.length"
						:error="viewModel.state.pageError"
						:has-items="viewModel.state.users.length > 0"
						empty-label="No users"
					>
						<ToolTip
							v-for="user in viewModel.state.users"
							:key="user.id"
							class="preview-tool-tip__item"
							trigger-class="preview-tool-tip__summary"
						>
							<template #trigger>
								<span class="preview-tool-tip__main preview-tool-tip__main_user">
									<span class="preview-tool-tip__avatar" aria-hidden="true">{{ viewModel.userInitials(user.name) }}</span>
									<span>
										<strong>{{ user.name }} <span>· {{ viewModel.sexIcon(user.sex) }} {{ user.age }}</span></strong>
										<span class="preview-tool-tip__chips">
											<template v-if="viewModel.userProjectTitlesList(user.id).length">
												<small
													v-for="title in viewModel.userProjectTitlesList(user.id).slice(0, 2)"
													:key="title"
												>
													{{ title }}
												</small>
												<small v-if="viewModel.userProjectTitlesList(user.id).length > 2">
													+{{ viewModel.userProjectTitlesList(user.id).length - 2 }}
												</small>
											</template>
											<small v-else>No projects</small>
										</span>
									</span>
								</span>
								<span class="tool-tip__icon-button" aria-hidden="true"></span>
							</template>

							<button type="button" @click="viewModel.openEditUserModal(user)">
								Edit
							</button>
							<button type="button" class="tool-tip__menu-danger" @click="viewModel.deleteUser(user)">
								Delete
							</button>
						</ToolTip>
					</PreviewToolTip>
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
import PreviewToolTip from '~/components/PreviewToolTip.vue';
import Sidebar from '~/components/Sidebar.vue';
import ToolTip from '~/components/ToolTip.vue';
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
