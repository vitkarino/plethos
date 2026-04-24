<template>
	<div class="AppLayout">
		<Sidebar>
			<template #top>
				<div class="AppLayout__logo">
					<img :src="pulsoLogo" alt="Pulso" />
				</div>
			</template>

			<template #nav>
				<div class="AppLayout__navItem">
					<NuxtLink
						class="AppLayout__link AppLayout__link--home"
						data-shortcut="Ctrl + 1"
						:to="viewModel.workPath('/dashboard')"
					>
						Головна
					</NuxtLink>
				</div>

				<div class="AppLayout__navItem AppLayout__navItem--preview">
					<NuxtLink class="AppLayout__link AppLayout__link--projects" data-shortcut="Ctrl + 2" to="/projects">
						<span>Проєкти</span>
						<small v-if="viewModel.state.selectedProject" class="AppLayout__linkMeta">
							{{ viewModel.selectedProjectLabel() }}
						</small>
					</NuxtLink>

					<div class="AppLayout__preview">
						<div class="AppLayout__previewHeader">
							<strong>Проєкти</strong>
							<span>{{ viewModel.state.projects.length }}</span>
						</div>

						<p v-if="viewModel.state.pageError" class="AppLayout__previewError">
							{{ viewModel.state.pageError }}
						</p>

						<div v-if="viewModel.state.projects.length" class="AppLayout__previewList">
							<div
								v-for="project in viewModel.state.projects"
								:key="project.id"
								class="AppLayout__previewItem"
								:class="{ 'AppLayout__previewItem--selected': viewModel.isProjectSelected(project) }"
							>
								<NuxtLink
									class="AppLayout__previewMain"
									:to="viewModel.projectDashboardPath(project)"
									@click="viewModel.selectProject(project)"
								>
									<strong>{{ project.title }}</strong>
									<small>{{ viewModel.projectUserCount(project.id) }} users · {{ viewModel.formatDate(project.updated_at) }}</small>
								</NuxtLink>

								<div class="AppLayout__previewActions">
									<button
										class="AppLayout__iconButton AppLayout__iconButton--edit"
										type="button"
										title="Edit project"
										aria-label="Edit project"
										@click="viewModel.openEditProjectModal(project)"
									></button>
									<button
										class="AppLayout__iconButton AppLayout__iconButton--delete"
										type="button"
										title="Delete project"
										aria-label="Delete project"
										@click="viewModel.deleteProject(project)"
									></button>
								</div>
							</div>
						</div>

						<p v-else class="AppLayout__previewEmpty">No projects</p>
					</div>
				</div>

				<div class="AppLayout__navItem AppLayout__navItem--preview">
					<NuxtLink
						class="AppLayout__link AppLayout__link--users"
						data-shortcut="Ctrl + 3"
						:to="viewModel.workPath('/users')"
					>
						Користувачі
					</NuxtLink>

					<div class="AppLayout__preview">
						<div class="AppLayout__previewHeader">
							<strong>Користувачі</strong>
							<span>{{ viewModel.state.users.length }}</span>
						</div>

						<p v-if="viewModel.state.pageError" class="AppLayout__previewError">
							{{ viewModel.state.pageError }}
						</p>

						<div v-if="viewModel.state.users.length" class="AppLayout__previewList">
							<div
								v-for="user in viewModel.state.users"
								:key="user.id"
								class="AppLayout__previewItem"
							>
								<NuxtLink class="AppLayout__previewMain" :to="viewModel.workPath('/users')">
									<strong>{{ user.name }}</strong>
									<small>{{ viewModel.sexLabel(user.sex) }}, {{ user.age }} · {{ viewModel.userProjectTitles(user.id) }}</small>
								</NuxtLink>

								<div class="AppLayout__previewActions">
									<button
										class="AppLayout__iconButton AppLayout__iconButton--edit"
										type="button"
										title="Edit user"
										aria-label="Edit user"
										@click="viewModel.openEditUserModal(user)"
									></button>
									<button
										class="AppLayout__iconButton AppLayout__iconButton--delete"
										type="button"
										title="Delete user"
										aria-label="Delete user"
										@click="viewModel.deleteUser(user)"
									></button>
								</div>
							</div>
						</div>

						<p v-else class="AppLayout__previewEmpty">No users</p>
					</div>
				</div>

				<div class="AppLayout__navItem">
					<NuxtLink
						class="AppLayout__link AppLayout__link--chat"
						data-shortcut="Ctrl + 4"
						:to="viewModel.workPath('/ai')"
					>
						ШІ Чат
					</NuxtLink>
				</div>

				<div class="AppLayout__navItem">
					<a class="AppLayout__link AppLayout__link--signals" data-shortcut="Ctrl + 5" href="#">Редактор сигналів</a>
				</div>
			</template>

			<template #bottom>
				<a class="AppLayout__link AppLayout__link--author" href="https://github.com/vitkarino/pulso.git" target="_blank">GitHub</a>
			</template>
		</Sidebar>

		<main class="AppLayout__content">
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

			<p v-if="viewModel.state.projectFormError" class="AppLayout__formError">
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

			<p v-if="viewModel.state.userFormError" class="AppLayout__formError">
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

viewModel.initialize(getRouteProjectName(route.params.name));

watch(
	() => route.params.name,
	(value) => viewModel.syncSelectedProject(getRouteProjectName(value)),
);

onMounted(() => {
	window.addEventListener('keydown', handleShortcutKey);
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', handleShortcutKey);
});

function handleShortcutKey(event: KeyboardEvent) {
	if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !/^[1-5]$/.test(event.key)) {
		return;
	}

	const target = event.target;

	if (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		target instanceof HTMLElement && target.isContentEditable
	) {
		return;
	}

	const link = document.querySelector<HTMLAnchorElement>(`.AppLayout__link[data-shortcut="Ctrl + ${event.key}"]`);

	if (!link) {
		return;
	}

	event.preventDefault();
	link.click();
}

function getRouteProjectName(value: unknown) {
	if (Array.isArray(value)) {
		return value[0] ?? '';
	}

	return typeof value === 'string' ? value : '';
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/layouts/default";
</style>
