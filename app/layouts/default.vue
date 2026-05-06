<template>
	<div
		class="app-layout"
		:class="{ 'app-layout_modal-open': viewModel.state.isProjectModalOpen || viewModel.state.isUserModalOpen }"
	>
		<Sidebar
			:collapsed="viewModel.state.isSidebarCollapsed"
			@toggle="viewModel.toggleSidebar()"
		>
			<template #top>
				<div class="app-layout__logo">
					<img :src="pulsoLogo" alt="Pulso" />
				</div>
			</template>

			<template #nav>
				<div
					v-if="viewModel.state.selectedProject"
					class="app-layout__project-info"
					:title="viewModel.selectedProjectLabel()"
				>
					<span>Поточний проєкт</span>
					<strong>{{ viewModel.selectedProjectLabel() }}</strong>
				</div>

				<div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_home"
						:to="viewModel.workPath('/dashboard')"
						title="Вимірювання"
					>
						<span>Вимірювання</span>
					</NuxtLink>
				</div>

				<div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_records"
						:to="viewModel.workPath('/records')"
						title="Записи"
					>
						<span>Записи</span>
					</NuxtLink>
				</div>

				<div class="app-layout__nav-item app-layout__nav-item_preview">
					<NuxtLink class="app-layout__link app-layout__link_projects" to="/projects" title="Проєкти">
						<span>Проєкти</span>
					</NuxtLink>

					<PreviewToolTip
						title="Проєкти"
						:count="viewModel.state.projects.length"
						count-icon="projects"
						:error="viewModel.state.pageError"
						:has-items="viewModel.state.projects.length > 0"
						empty-label="Немає проєктів"
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
									<small>{{ viewModel.projectUserCount(project.id) }} користувачів · {{ viewModel.formatDate(project.updated_at) }}</small>
								</span>
								<span class="tool-tip__icon-button" aria-hidden="true"></span>
							</template>

							<button type="button" @click="viewModel.switchToProject(project)">
								Перейти до проєкту
							</button>
							<button type="button" @click="viewModel.openEditProjectModal(project)">
								Редагувати
							</button>
							<button type="button" class="tool-tip__menu-danger" @click="viewModel.deleteProject(project)">
								Видалити
							</button>
						</ToolTip>
					</PreviewToolTip>
				</div>

				<div class="app-layout__nav-item app-layout__nav-item_preview">
					<NuxtLink
						class="app-layout__link app-layout__link_users"
						:to="viewModel.workPath('/users')"
						title="Користувачі"
					>
						<span>Користувачі</span>
					</NuxtLink>

					<PreviewToolTip
						title="Користувачі"
						:count="viewModel.state.users.length"
						count-icon="users"
						:error="viewModel.state.pageError"
						:has-items="viewModel.state.users.length > 0"
						empty-label="Немає користувачів"
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
											<small v-else>Проєктів: {{ user.projects_count ?? 0 }}</small>
										</span>
									</span>
								</span>
								<span class="tool-tip__icon-button" aria-hidden="true"></span>
							</template>

							<button type="button" @click="viewModel.openEditUserModal(user)">
								Редагувати
							</button>
							<button type="button" class="tool-tip__menu-danger" @click="viewModel.deleteUser(user)">
								Видалити
							</button>
						</ToolTip>
					</PreviewToolTip>
				</div>

				<!-- СТРОГО НЕ УДАЛЯТЬ, ОСТАВИТЬ НА БУДУЩЕЕ: функціонал ШІ-чату тимчасово вимкнено. -->
				<!-- <div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_chat"
						:to="viewModel.workPath('/ai')"
					>
						ШІ Чат
					</NuxtLink>
				</div> -->
				<div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_chat"
						:to="viewModel.workPath('/ai')"
						title="ШІ Чат"
					>
						<span>Асистент</span>
					</NuxtLink>
				</div>
			</template>

			<template #bottom>
				<a class="app-layout__link app-layout__link_author" href="https://github.com/vitkarino/pulso.git" target="_blank" title="GitHub">
					<span>GitHub</span>
				</a>
			</template>
		</Sidebar>

		<main class="app-layout__content">
			<header v-if="pageTitle" class="app-layout__page-header">
				<div class="app-layout__page-heading">
					<p v-if="pageHeader.subtitle">{{ pageHeader.subtitle }}</p>
					<h1>{{ pageTitle }}</h1>
				</div>

				<div v-if="pageHeader.actions.length" class="app-layout__page-actions">
					<template v-for="action in pageHeader.actions" :key="action.label">
						<NuxtLink
							v-if="action.to"
							class="app-layout__page-action"
							:class="pageHeaderActionClasses(action)"
							:to="action.to"
						>
							{{ action.label }}
						</NuxtLink>
						<button
							v-else
							class="app-layout__page-action"
							:class="pageHeaderActionClasses(action)"
							type="button"
							:disabled="pageHeaderActionDisabled(action)"
							@click="action.onClick?.()"
						>
							{{ action.label }}
						</button>
					</template>
				</div>
			</header>

			<div class="app-layout__page-body">
				<slot />
			</div>
		</main>

		<Modal
			:is-open="viewModel.state.isProjectModalOpen"
			title="Редагувати проєкт"
			submit-label="Зберегти зміни"
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
			<span class="app-layout__field-hint">
				{{ viewModel.state.projectForm.description.length }}/{{ PROJECT_DESCRIPTION_MAX_LENGTH }}
			</span>

			<p v-if="viewModel.state.projectFormError" class="app-layout__form-error">
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
import SelectBox from '~/components/SelectBox.vue';
import Sidebar from '~/components/Sidebar.vue';
import ToolTip from '~/components/ToolTip.vue';
import type { PageHeaderAction } from '~/composables/usePageHeader';
import { PROJECT_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { DefaultLayoutViewModel } from '~/controllers/layouts/DefaultLayoutViewModel';

const viewModel = new DefaultLayoutViewModel();
const route = useRoute();
const pageHeader = providePageHeader();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

viewModel.initialize(route.params.name);

const defaultPageTitle = computed(() => {
	if (route.path === '/projects') {
		return 'Проєкти';
	}

	if (route.path.endsWith('/dashboard')) {
		return 'Вимірювання';
	}

	if (route.path.endsWith('/records')) {
		return 'Записи';
	}

	if (route.path.endsWith('/users')) {
		return 'Користувачі';
	}

	if (route.path.endsWith('/ai')) {
		return 'Асистент';
	}

	return viewModel.selectedProjectLabel();
});
const pageTitle = computed(() => pageHeader.title || defaultPageTitle.value);

function pageHeaderActionDisabled(action: PageHeaderAction) {
	return Boolean(action.disabled === undefined ? false : unref(action.disabled));
}

function pageHeaderActionClasses(action: PageHeaderAction) {
	return [
		action.variant ? `app-layout__page-action_${action.variant}` : '',
		action.icon ? `app-layout__page-action_${action.icon}` : '',
	];
}

watch(
	() => route.params.name,
	(value) => viewModel.syncSelectedProjectByRouteParam(value),
);

</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/layouts/default";
</style>
