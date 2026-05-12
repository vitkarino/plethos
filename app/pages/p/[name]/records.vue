<template>
	<BlocksGrid>
		<template #topLeft>
			<BPMBlock
				:project-id="viewModel.state.project?.id ?? null"
				:selected-recording-id="selectedRecordingId"
				:show-controls="false"
				:show-export="true"
				:show-recording-markers="false"
				:show-recording-select="true"
				quality-metric-mode="analysis"
				@recording-select="selectRecording"
			/>
		</template>
	</BlocksGrid>
</template>

<script setup lang="ts">
import BlocksGrid from '~/components/BlocksGrid.vue';
import BPMBlock from '~/components/BPMBlock.vue';
import { ProjectDashboardPageViewModel } from '~/controllers/pages/ProjectDashboardPageViewModel';

const route = useRoute();
const router = useRouter();
const projectName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const viewModel = new ProjectDashboardPageViewModel(projectName ?? '');
const dashboardPath = computed(() => `/p/${projectName ?? ''}/dashboard`);
const selectedRecordingId = computed(() => {
	const value = route.query.recording;

	return typeof value === 'string' ? value : null;
});

usePageHeader({
	title: 'Записи',
	backLabel: '<',
	backTo: dashboardPath,
});

viewModel.initialize();

function selectRecording(recordingId: string) {
	void router.replace({
		path: route.path,
		query: {
			...route.query,
			recording: recordingId,
		},
	});
}
</script>
