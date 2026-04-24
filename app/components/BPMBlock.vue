<template>
	<Block class="BPMBlock">
		<div class="BPMBlock__header">
			<div class="BPMBlock__title">Сигнал</div>
			<button class="BPMBlock__title" @click="viewModel.startMeasurement()">Start</button>
			<div class="BPMBlock__value">
				{{ viewModel.state.bpm !== null ? Math.round(viewModel.state.bpm) : '--' }}
			</div>
		</div>

		<div class="BPMBlock__status">
			<span v-if="viewModel.state.status === 'recording'">
				Recording {{ Math.round(viewModel.state.progress) }}%
			</span>
			<span v-else-if="viewModel.state.status === 'ready'">
				Latest measurement
			</span>
			<span v-else-if="viewModel.state.status === 'failed'">
				{{ viewModel.state.error }}
			</span>
			<span v-else>
				Waiting for data
			</span>
		</div>

		<div class="BPMBlock__chart">
			<pre v-if="viewModel.state.chartData">{{ viewModel.state.chartData }}</pre>
			<p v-else>No chart data yet</p>
		</div>
	</Block>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import { BPMBlockViewModel } from '~/controllers/components/BPMBlockViewModel';

const viewModel = new BPMBlockViewModel();

onMounted(() => {
	viewModel.initialize();
});

onBeforeUnmount(() => {
	viewModel.destroy();
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/BPMBlock";
</style>
