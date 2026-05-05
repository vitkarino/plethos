<template>
	<BlocksGrid>
		<template #topLeft>
			<BPMBlock
				:project-id="viewModel.state.project?.id ?? null"
				:show-controls="false"
				:show-export="true"
				:show-recording-markers="false"
				:show-recording-select="true"
				quality-metric-mode="analysis"
			>
				<template #header>
					Записи
				</template>
			</BPMBlock>
		</template>
	</BlocksGrid>
</template>

<script setup lang="ts">
import BlocksGrid from '~/components/BlocksGrid.vue';
import BPMBlock from '~/components/BPMBlock.vue';
import { ProjectDashboardPageViewModel } from '~/controllers/pages/ProjectDashboardPageViewModel';

const route = useRoute();
const projectName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const viewModel = new ProjectDashboardPageViewModel(projectName ?? '');

viewModel.initialize();
</script>
