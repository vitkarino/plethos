<template>
	<div
		class="app-layout"
		:class="{
			'app-layout_modal-open': viewModel.state.isStudyModalOpen || viewModel.state.isParticipantModalOpen,
			'app-layout_activity-open': viewModel.state.activeSidebarPanel,
		}"
	>
		<Sidebar>
			<template #nav>
				<div v-for="item in sidebarNavItems" :key="item.key" class="app-layout__nav-item">
					<button
						class="app-layout__link"
						:class="[
							item.iconClass,
							{ 'app-layout__link_panel-active': viewModel.state.activeSidebarPanel === item.key },
						]"
						type="button"
						:aria-label="item.title"
						@click="viewModel.toggleSidebarPanel(item.key)"
					>
						<span>{{ item.label }}</span>
					</button>
				</div>
			</template>

			<template #bottom>
				<a class="app-layout__link app-layout__link_author" href="https://github.com/vitkarino/pulso.git" target="_blank" aria-label="GitHub">
					<span>GitHub</span>
				</a>
			</template>
		</Sidebar>

		<Transition name="app-layout-activity">
			<aside v-if="activeSidebarPanelItem" class="app-layout__activity-panel">
				<header class="app-layout__activity-header">
					<div>
						<Transition name="app-layout-activity-tab-title" mode="out-in">
							<h2 :key="activeSidebarPanelItem.key">
								<span>{{ activeSidebarPanelItem.label }}</span>
							</h2>
						</Transition>
					</div>
					<div v-if="viewModel.state.activeSidebarPanel === 'records' || viewModel.state.activeSidebarPanel === 'studies' || viewModel.state.activeSidebarPanel === 'participants' || viewModel.state.activeSidebarPanel === 'ai'" class="app-layout__activity-actions">
						<ActivityRefreshButton
							v-if="viewModel.state.activeSidebarPanel === 'records'"
							label="Оновити записи"
							@click="recordsPanelRef?.reload()"
						/>
						<ActivityRefreshButton
							v-if="viewModel.state.activeSidebarPanel === 'studies'"
							label="Оновити дослідження"
							@click="studiesPanelRef?.reload()"
						/>
						<button
							v-if="viewModel.state.activeSidebarPanel === 'studies'"
							class="app-layout__activity-add-study"
							type="button"
							aria-label="Створити дослідження"
							@click="studiesPanelRef?.openCreateStudyModal()"
						></button>
						<template v-if="viewModel.state.activeSidebarPanel === 'participants'">
							<ActivityRefreshButton label="Оновити учасників" @click="participantsPanelRef?.reload()" />
							<button
								class="app-layout__activity-add-participant"
								type="button"
								aria-label="Додати учасника"
								@click="participantsPanelRef?.openCreateParticipantModal()"
							></button>
						</template>
						<button
							v-if="viewModel.state.activeSidebarPanel === 'ai'"
							class="app-layout__activity-chat-history"
							type="button"
							aria-label="Історія чатів"
							@click="assistantPanelRef?.toggleChatHistory()"
						></button>
						<button
							v-if="viewModel.state.activeSidebarPanel === 'ai'"
							class="app-layout__activity-new-chat"
							type="button"
							aria-label="Новий чат"
							@click="assistantPanelRef?.startNewChat()"
						></button>
					</div>
					<button
						class="app-layout__activity-close"
						type="button"
						aria-label="Закрити панель"
						@click="viewModel.closeSidebarPanel()"
					></button>
				</header>

				<div class="app-layout__activity-body">
					<Transition name="app-layout-activity-tab" mode="out-in">
						<ActivityRecordsPanel
							v-if="viewModel.state.activeSidebarPanel === 'records'"
							key="records"
							ref="recordsPanelRef"
							:study-id="viewModel.state.selectedStudy?.id ?? null"
							:dashboard-path="viewModel.selectedStudyDashboardPath()"
							:active-recording-id="activeRecordingId"
							@select="viewModel.closeSidebarPanel()"
						/>
						<ActivityStudiesPanel
							v-else-if="viewModel.state.activeSidebarPanel === 'studies'"
							key="studies"
							ref="studiesPanelRef"
							@select="viewModel.closeSidebarPanel()"
						/>
						<ActivityParticipantsPanel
							v-else-if="viewModel.state.activeSidebarPanel === 'participants'"
							key="participants"
							ref="participantsPanelRef"
						/>
						<ActivityAssistantPanel
							v-else-if="viewModel.state.activeSidebarPanel === 'ai'"
							key="ai"
							ref="assistantPanelRef"
							:study-id="viewModel.state.selectedStudy?.id ?? null"
							:active-recording-id="activeRecordingId"
						/>
					</Transition>
				</div>
			</aside>
		</Transition>

		<main class="app-layout__content" @click="viewModel.closeSidebarPanel()">
			<header v-if="pageTitle" class="app-layout__page-header">
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

			<div class="app-layout__status-slot"></div>

			<div class="app-layout__page-body">
				<slot />
			</div>
		</main>

		<Modal
			:is-open="viewModel.state.isStudyModalOpen"
			title="Редагувати дослідження"
			submit-label="Зберегти зміни"
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
			<span class="app-layout__field-hint">
				{{ viewModel.state.studyForm.description.length }}/{{ STUDY_DESCRIPTION_MAX_LENGTH }}
			</span>

			<p v-if="viewModel.state.studyFormError" class="app-layout__form-error">
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

			<p v-if="viewModel.state.participantFormError" class="app-layout__form-error">
				{{ viewModel.state.participantFormError }}
			</p>
		</Modal>
	</div>
</template>

<script setup lang="ts">
import ActivityAssistantPanel from '~/components/activity/ActivityAssistantPanel.vue';
import ActivityParticipantsPanel from '~/components/activity/ActivityParticipantsPanel.vue';
import ActivityRecordsPanel from '~/components/activity/ActivityRecordsPanel.vue';
import ActivityRefreshButton from '~/components/activity/ActivityRefreshButton.vue';
import ActivityStudiesPanel from '~/components/activity/ActivityStudiesPanel.vue';
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import Sidebar from '~/components/Sidebar.vue';
import type { PageHeaderAction } from '~/composables/usePageHeader';
import { STUDY_DESCRIPTION_MAX_LENGTH } from '~/constants/forms';
import { DefaultLayoutViewModel } from '~/controllers/layouts/DefaultLayoutViewModel';
import type { SidebarPanelKey } from '~/types/layouts/default';

type SidebarNavItem = {
	key: SidebarPanelKey
	label: string
	title: string
	iconClass: string
}

const viewModel = new DefaultLayoutViewModel();
const route = useRoute();
const pageHeader = providePageHeader();
const recordsPanelRef = ref<InstanceType<typeof ActivityRecordsPanel> | null>(null);
const studiesPanelRef = ref<InstanceType<typeof ActivityStudiesPanel> | null>(null);
const participantsPanelRef = ref<InstanceType<typeof ActivityParticipantsPanel> | null>(null);
const assistantPanelRef = ref<InstanceType<typeof ActivityAssistantPanel> | null>(null);
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

viewModel.initialize(route.params.name).finally(syncStudySelectionFallback);
viewModel.syncSidebarPanelFromPath(route.path);

const sidebarNavItems = computed<SidebarNavItem[]>(() => [
	{
		key: 'records',
		label: 'Записи',
		title: 'Записи',
		iconClass: 'app-layout__link_records',
	},
	{
		key: 'studies',
		label: 'Дослідження',
		title: 'Дослідження',
		iconClass: 'app-layout__link_studies',
	},
	{
		key: 'participants',
		label: 'Учасники',
		title: 'Учасники',
		iconClass: 'app-layout__link_participants',
	},
	{
		key: 'ai',
		label: 'Асистент',
		title: 'ШІ Чат',
		iconClass: 'app-layout__link_chat',
	},
]);

const activeSidebarPanelItem = computed(() => {
	return sidebarNavItems.value.find((item) => item.key === viewModel.state.activeSidebarPanel) ?? null;
});
const activeRecordingId = computed(() => {
	const value = route.params.recordingId ?? route.query.recording;

	return typeof value === 'string' ? value : null;
});
const isStudySelectionFallback = computed(() => route.path === '/studies' && !viewModel.state.selectedStudy);

const defaultPageTitle = computed(() => {
	if (isStudySelectionFallback.value) {
		return '';
	}

	if (route.path === '/studies') {
		return 'Дослідження';
	}
	if (route.path === '/participants') {
		return 'Учасники';
	}

	if (route.path.endsWith('/dashboard')) {
		return 'Вимірювання';
	}

	return viewModel.selectedStudyLabel();
});
const pageTitle = computed(() => isStudySelectionFallback.value ? '' : pageHeader.title || defaultPageTitle.value);

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
	(value) => {
		viewModel.syncSelectedStudyByRouteParam(value);
		syncStudySelectionFallback();
	},
);

watch(
	() => route.path,
	(path) => {
		viewModel.syncSidebarPanelFromPath(path);
		syncStudySelectionFallback();
	},
);

watch(
	() => viewModel.state.selectedStudy,
	syncStudySelectionFallback,
);

function syncStudySelectionFallback() {
	if (route.path === '/studies' && !viewModel.state.selectedStudy) {
		viewModel.openSidebarPanel('studies');
	}
}

</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/layouts/default";
</style>
