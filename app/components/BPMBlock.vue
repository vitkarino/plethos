<template>
	<Block class="bpm-block">
		<template #header>
			<slot name="header" />
		</template>

		<div class="bpm-block__header">
			<button class="bpm-block__title" @click="viewModel.startMeasurement()">Старт</button>
		</div>

		<div class="bpm-block__metrics">
			<div class="bpm-block__metric">
				<span class="bpm-block__metric-content">
					<span>BPM</span>
					<strong>{{ viewModel.state.bpm !== null ? Math.round(viewModel.state.bpm) : '--' }}</strong>
				</span>
				<span class="bpm-block__metric-icon bpm-block__metric-icon_bpm" aria-hidden="true"></span>
			</div>
			<div class="bpm-block__metric">
				<span class="bpm-block__metric-content">
					<span>SpO2</span>
					<strong>{{ viewModel.state.spo2 !== null ? `${Math.round(viewModel.state.spo2)}%` : '--' }}</strong>
				</span>
				<span class="bpm-block__metric-icon bpm-block__metric-icon_spo2" aria-hidden="true"></span>
			</div>
			<div class="bpm-block__metric">
				<span class="bpm-block__metric-content">
					<span>Якість сигналу</span>
					<strong>{{ viewModel.state.signalQuality !== null ? `${Math.round(viewModel.state.signalQuality)}%` : '--' }}</strong>
				</span>
				<span class="bpm-block__metric-icon bpm-block__metric-icon_signal" aria-hidden="true"></span>
			</div>
		</div>

		<div class="bpm-block__selects">
			<SelectBox v-model="selectedDevice" label="Пристрій" :items="devices" />
			<SelectBox v-model="selectedFilter" label="Фільтр" :items="filters" />
		</div>

		<div class="bpm-block__status">
			<span v-if="viewModel.state.status === 'recording'">
				Запис {{ Math.round(viewModel.state.progress) }}%
			</span>
			<span v-else-if="viewModel.state.status === 'ready'">
				Останнє вимірювання
			</span>
			<span v-else-if="viewModel.state.status === 'failed'">
				{{ viewModel.state.error }}
			</span>
			<span v-else>
				Очікування даних
			</span>
		</div>

		<div class="bpm-block__charts">
			<div class="bpm-block__chart">
				<div class="bpm-block__chart-header">
					<span>IR</span>
					<strong>Інфрачервоний</strong>
				</div>
				<canvas
					ref="irChartCanvas"
					class="bpm-block__canvas"
					:class="{ 'bpm-block__canvas--hidden': !viewModel.state.chartData }"
				/>
			</div>
			<div class="bpm-block__chart">
				<div class="bpm-block__chart-header">
					<span>R</span>
					<strong>Червоний</strong>
				</div>
				<canvas
					ref="rChartCanvas"
					class="bpm-block__canvas"
					:class="{ 'bpm-block__canvas--hidden': !viewModel.state.chartData }"
				/>
			</div>
			<p v-if="!viewModel.state.chartData" class="bpm-block__empty">Даних графіка ще немає</p>
		</div>

		<template #footer>
			<slot name="footer" />
		</template>
	</Block>
</template>

<script setup lang="ts">
import {
	CategoryScale,
	Chart,
	Filler,
	Legend,
	LineController,
	LineElement,
	LinearScale,
	PointElement,
	Tooltip,
	type ChartConfiguration,
	type ChartDataset,
	type ChartOptions,
} from 'chart.js';
import Block from '~/components/Block.vue';
import SelectBox from '~/components/SelectBox.vue';
import { BPMBlockViewModel } from '~/controllers/components/BPMBlockViewModel';
import type { BPMChartDataset, PulseSample } from '~/types/components/bpm-block';

Chart.register(
	CategoryScale,
	Filler,
	LineController,
	LineElement,
	LinearScale,
	PointElement,
	Legend,
	Tooltip,
);

const viewModel = new BPMBlockViewModel();
const irChartCanvas = ref<HTMLCanvasElement | null>(null);
const rChartCanvas = ref<HTMLCanvasElement | null>(null);
const devices = reactive({
	device1: 'mock-device-1',
	device2: 'mock-device-2',
	device3: 'mock-device-3',
	device4: 'mock-device-4',
	device5: 'mock-device-5',
});
const filters = reactive({
	bandPass: 'Смуговий фільтр',
	lowPass: 'Низькочастотний фільтр',
	highPass: 'Високочастотний фільтр',
	notch: 'Режекторний фільтр 50/60 Гц',
	movingAverage: 'Ковзне середнє',
	median: 'Медіанний фільтр',
	savitzkyGolay: 'Фільтр Савицького-Голея',
	waveletDenoising: 'Вейвлет-знешумлення',
});
const selectedDevice = ref(devices.device1);
const selectedFilter = ref(filters.bandPass);
type BPMChartPoint = number | PulseSample;

const charts: Record<'ir' | 'r', Chart<'line', BPMChartPoint[], number> | null> = {
	ir: null,
	r: null,
};

function getChartOptions(data: number[], usesSampleObjects: boolean, xRange: { min: number; max: number } | null): ChartOptions<'line'> {
	const yRange = getYRange(data);

	return {
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		interaction: {
			intersect: false,
			mode: 'index',
		},
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				enabled: true,
			},
		},
		scales: {
			x: {
				type: usesSampleObjects ? 'linear' : 'category',
				...(usesSampleObjects && xRange ? {
					min: xRange.min,
					max: xRange.max,
				} : {}),
				grid: {
					color: 'rgba(143, 152, 167, 0.1)',
				},
				ticks: {
					color: '#8f98a7',
					maxTicksLimit: 6,
				},
			},
			y: {
				min: yRange.min,
				max: yRange.max,
				grid: {
					color: 'rgba(143, 152, 167, 0.1)',
				},
				ticks: {
					color: '#8f98a7',
					maxTicksLimit: 4,
				},
			},
		},
	};
}

function getYRange(data: number[]) {
	const values = data.filter((value) => Number.isFinite(value));

	if (!values.length) {
		return {
			min: 0,
			max: 1,
		};
	}

	const min = Math.min(...values);
	const max = Math.max(...values);
	const padding = Math.max((max - min) * 0.22, Math.abs(max || 1) * 0.002, 1);

	return {
		min: min - padding,
		max: max + padding,
	};
}

function isPulseSample(point: BPMChartPoint): point is PulseSample {
	return typeof point === 'object' && point !== null && 'raw_data' in point;
}

function getSampleValue(sample: PulseSample, channel?: 'ir' | 'r') {
	return Number(channel ? sample.raw_data[channel] : sample.raw_data.ir);
}

function getDatasetValues(dataset: BPMChartDataset, data = dataset.data) {
	return data.map((point) => {
		return isPulseSample(point) ? getSampleValue(point, dataset.sampleChannel) : point;
	});
}

function getXRange(data: BPMChartPoint[], labels?: number[]) {
	const values = data
		.map((point, index) => {
			return isPulseSample(point) ? point.sample_index : labels?.[index];
		})
		.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

	if (!values.length) {
		return null;
	}

	return {
		min: Math.min(...values),
		max: Math.max(...values),
	};
}

function getDatasetByChannel(channel: 'ir' | 'r') {
	return viewModel.state.chartData?.datasets.find((dataset) => {
		const label = dataset.label.trim().toLowerCase();

		return channel === 'ir' ? label === 'ir' : label === 'r' || label === 'red';
	}) ?? null;
}

function getChartData(dataset: BPMChartDataset) {
	const chartData = viewModel.state.chartData;

	return {
		labels: chartData?.labels,
		data: dataset.data,
	};
}

function getChartDataset(channel: 'ir' | 'r') {
	const dataset = getDatasetByChannel(channel);

	if (!dataset) {
		return null;
	}

	const defaultColor = channel === 'ir' ? '#4aa8ff' : '#e85d75';
	const fillColor = channel === 'ir' ? 'rgba(74, 168, 255, 0.18)' : 'rgba(232, 93, 117, 0.18)';
	const chartData = getChartData(dataset);
	const usesSampleObjects = chartData.data.some(isPulseSample);

	return {
		labels: chartData.labels,
		values: getDatasetValues(dataset, chartData.data),
		xRange: getXRange(chartData.data, chartData.labels),
		usesSampleObjects,
		dataset: {
			label: dataset.label,
			data: chartData.data,
			parsing: dataset.parsing,
			borderColor: dataset.borderColor ?? defaultColor,
			backgroundColor: fillColor,
			borderWidth: 2,
			fill: true,
			pointRadius: dataset.pointRadius ?? 0,
			pointHoverRadius: dataset.pointHoverRadius ?? 3,
			tension: 0.32,
			yAxisID: dataset.yAxisID,
		} satisfies ChartDataset<'line', BPMChartPoint[]>,
	};
}

function getChartConfig(channel: 'ir' | 'r'): ChartConfiguration<'line', BPMChartPoint[], number> | null {
	if (!viewModel.state.chartData) {
		return null;
	}

	const chartDataset = getChartDataset(channel);

	if (!chartDataset) {
		return null;
	}

	return {
		type: 'line',
		data: {
			labels: chartDataset.labels,
			datasets: [chartDataset.dataset],
		},
		options: getChartOptions(chartDataset.values, chartDataset.usesSampleObjects, chartDataset.xRange),
	};
}

function renderChart(channel: 'ir' | 'r', canvas: HTMLCanvasElement | null) {
	const config = getChartConfig(channel);

	if (!config || !canvas) {
		charts[channel]?.destroy();
		charts[channel] = null;
		return;
	}

	if (!charts[channel]) {
		charts[channel] = new Chart(canvas, config);
		return;
	}

	charts[channel].data.labels = config.data.labels;
	charts[channel].data.datasets = config.data.datasets;
	charts[channel].options = config.options ?? {};
	charts[channel].update('none');
}

function renderCharts() {
	renderChart('ir', irChartCanvas.value);
	renderChart('r', rChartCanvas.value);
}

onMounted(() => {
	viewModel.initialize();
	renderCharts();
});

onBeforeUnmount(() => {
	charts.ir?.destroy();
	charts.r?.destroy();
	viewModel.destroy();
});

watch(
	() => viewModel.state.chartData,
	() => {
		renderCharts();
	},
	{ deep: true, flush: 'post' },
);
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/BPMBlock";
</style>
