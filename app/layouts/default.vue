<template>
	<div
		class="app-layout"
		:class="{
			'app-layout_modal-open': viewModel.state.isProjectModalOpen || viewModel.state.isUserModalOpen,
			'app-layout_activity-open': viewModel.state.activeSidebarPanel,
			'app-layout_sidebar-collapsed': viewModel.state.isSidebarCollapsed,
		}"
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
				<!-- СТРОГО НЕ УДАЛЯТЬ, ОСТАВИТЬ НА БУДУЩЕЕ: функціонал ШІ-чату тимчасово вимкнено. -->
				<!-- <div class="app-layout__nav-item">
					<NuxtLink
						class="app-layout__link app-layout__link_chat"
						:to="viewModel.workPath('/ai')"
					>
						ШІ Чат
					</NuxtLink>
				</div> -->

				<div v-for="item in sidebarNavItems" :key="item.key" class="app-layout__nav-item">
					<button
						class="app-layout__link"
						:class="[
							item.iconClass,
							{ 'app-layout__link_panel-active': viewModel.state.activeSidebarPanel === item.key },
						]"
						type="button"
						:title="item.title"
						@click="viewModel.toggleSidebarPanel(item.key)"
					>
						<span>{{ item.label }}</span>
					</button>
				</div>
			</template>

			<template #bottom>
				<a class="app-layout__link app-layout__link_author" href="https://github.com/vitkarino/pulso.git" target="_blank" title="GitHub">
					<span>GitHub</span>
				</a>
			</template>
		</Sidebar>

		<Transition name="app-layout-activity">
			<aside v-if="activeSidebarPanelItem" class="app-layout__activity-panel">
				<header class="app-layout__activity-header">
					<div>
						<Transition name="app-layout-activity-tab-title" mode="out-in">
							<h2 :key="activeSidebarPanelItem.key">{{ activeSidebarPanelItem.label }}</h2>
						</Transition>
					</div>
					<button
						class="app-layout__activity-close"
						type="button"
						aria-label="Закрити панель"
						title="Закрити"
						@click="viewModel.closeSidebarPanel()"
					></button>
				</header>

				<div class="app-layout__activity-body">
					<Transition name="app-layout-activity-tab" mode="out-in">
						<ActivityRecordsPanel
							v-if="viewModel.state.activeSidebarPanel === 'records'"
							key="records"
							:project-id="viewModel.state.selectedProject?.id ?? null"
							:records-path="viewModel.workPath('/records')"
							:active-recording-id="activeRecordingId"
						/>
						<ActivityProjectsPanel
							v-else-if="viewModel.state.activeSidebarPanel === 'projects'"
							key="projects"
						/>
						<ActivityUsersPanel
							v-else-if="viewModel.state.activeSidebarPanel === 'users'"
							key="users"
						/>
						<ActivityAssistantPanel
							v-else-if="viewModel.state.activeSidebarPanel === 'ai'"
							key="ai"
							:project-id="viewModel.state.selectedProject?.id ?? null"
						/>
					</Transition>
				</div>
			</aside>
		</Transition>

		<main class="app-layout__content" @click="viewModel.closeSidebarPanel()">
			<header v-if="pageTitle" class="app-layout__page-header">
				<div class="app-layout__page-intro">
					<NuxtLink
						v-if="pageHeader.backTo"
						class="app-layout__page-back"
						:to="pageHeader.backTo"
					>
						{{ pageHeader.backLabel || 'Повернутися' }}
					</NuxtLink>

					<div class="app-layout__page-heading">
						<p v-if="pageHeader.subtitle">{{ pageHeader.subtitle }}</p>
						<h1>{{ pageTitle }}</h1>
						<span v-if="pageHeader.modeLabel" class="app-layout__page-mode">
							{{ pageHeader.modeLabel }}
						</span>
					</div>
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
import ActivityAssistantPanel from '~/components/activity/ActivityAssistantPanel.vue';
import ActivityProjectsPanel from '~/components/activity/ActivityProjectsPanel.vue';
import ActivityRecordsPanel from '~/components/activity/ActivityRecordsPanel.vue';
import ActivityUsersPanel from '~/components/activity/ActivityUsersPanel.vue';
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import Sidebar from '~/components/Sidebar.vue';
import type { PageHeaderAction } from '~/composables/usePageHeader';
import { PROJECT_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { DefaultLayoutViewModel } from '~/controllers/layouts/DefaultLayoutViewModel';
import type { SidebarPanelKey } from '~/types/layouts/default';

type SidebarNavItem = {
	key: SidebarPanelKey
	label: string
	title: string
	to: string
	iconClass: string
}

const viewModel = new DefaultLayoutViewModel();
const route = useRoute();
const pageHeader = providePageHeader();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

viewModel.initialize(route.params.name);
viewModel.syncSidebarPanelFromPath(route.path);

const sidebarNavItems = computed<SidebarNavItem[]>(() => [
	{
		key: 'records',
		label: 'Записи',
		title: 'Записи',
		to: viewModel.workPath('/records'),
		iconClass: 'app-layout__link_records',
	},
	{
		key: 'projects',
		label: 'Проєкти',
		title: 'Проєкти',
		to: '/projects',
		iconClass: 'app-layout__link_projects',
	},
	{
		key: 'users',
		label: 'Користувачі',
		title: 'Користувачі',
		to: viewModel.workPath('/users'),
		iconClass: 'app-layout__link_users',
	},
	{
		key: 'ai',
		label: 'Асистент',
		title: 'ШІ Чат',
		to: viewModel.workPath('/ai'),
		iconClass: 'app-layout__link_chat',
	},
]);

const activeSidebarPanelItem = computed(() => {
	return sidebarNavItems.value.find((item) => item.key === viewModel.state.activeSidebarPanel) ?? null;
});
const activeRecordingId = computed(() => {
	const value = route.query.recording;

	return typeof value === 'string' ? value : null;
});

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

watch(
	() => route.path,
	(path) => viewModel.syncSidebarPanelFromPath(path),
);

</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/layouts/default";
</style>
