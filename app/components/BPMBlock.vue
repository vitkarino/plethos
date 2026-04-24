<template>
	<Block class="BPMBlock">
		<div class="BPMBlock__header">
			<div class="BPMBlock__title">Сигнал</div>
			<button class="BPMBlock__title" @click="UI.startMeasurement()">Start</button>
			<div class="BPMBlock__value">
				{{ UI.bpm !== null ? Math.round(UI.bpm) : '--' }}
			</div>
		</div>

		<div class="BPMBlock__status">
			<span v-if="UI.status === 'recording'">
				Recording {{ Math.round(UI.progress) }}%
			</span>
			<span v-else-if="UI.status === 'ready'">
				Latest measurement
			</span>
			<span v-else-if="UI.status === 'failed'">
				{{ UI.error }}
			</span>
			<span v-else>
				Waiting for data
			</span>
		</div>

		<div class="BPMBlock__chart">
			<pre v-if="UI.chartData">{{ UI.chartData }}</pre>
			<p v-else>No chart data yet</p>
		</div>
	</Block>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import { BPMBlockUI } from '~/controllers/BPMBlockUI';

const UI = new BPMBlockUI()

onMounted(() => {
	const incomedata = $fetch('/api/recordings').then((data) => {
		console.log('Received data:', data);
	}).catch((error) => {
		console.error('Error fetching data:', error);
	});
})
</script>

<style scoped lang="scss">
@use "~/styles/scss/components/BPMBlock";
</style>
