<template>
	<BlocksGrid>
		<template #topLeft>
			<BPMBlock />
		</template>

		<template #bottomLeft>
			<Block>
				<p>{{ viewModel.state.projectsLabel }}</p>
			</Block>
		</template>

		<template #right>
			<Block>
				<p>{{ viewModel.state.analysisLabel }}</p>
			</Block>
		</template>
	</BlocksGrid>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import BlocksGrid from '~/components/BlocksGrid.vue';
import BPMBlock from '~/components/BPMBlock.vue';
import { DashboardPageViewModel } from '~/controllers/pages/DashboardPageViewModel';

const viewModel = new DashboardPageViewModel();
</script>
