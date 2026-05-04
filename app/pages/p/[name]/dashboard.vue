<template>
	<BlocksGrid>
		<template #topLeft>
			<BPMBlock :project-id="viewModel.state.project?.id ?? null">
				<template #header>
					<div class="block-header-data">Сигнал</div>
				</template>

				<template #footer>
					<div class="block-footer-data">
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">Пристрій:</span>
							<span class="block-footer-data__value">{{ viewModel.state.project?.title ?? 'Не обрано' }}</span>
						</span>
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">ID:</span>
							<span class="block-footer-data__value">{{ viewModel.state.project?.id ?? '-' }}</span>
						</span>
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">Температура сенсора:</span>
							<span class="block-footer-data__value">Live API</span>
						</span>
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">Частота дискретизації:</span>
							<span class="block-footer-data__value">25 Hz</span>
						</span>
					</div>
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
