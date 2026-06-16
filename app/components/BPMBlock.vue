<template>
	<div class="bpm-block">
		<Teleport v-if="isPageHeaderActionTargetReady" to=".app-layout__page-header">
			<div v-if="shouldShowMetrics" class="bpm-block__header-metrics" aria-label="Показники запису">
				<div v-for="metric in metricCards" :key="metric.key" class="bpm-block__header-metric"
					:class="[`bpm-block__header-metric_${metric.key}`, metric.toneClass]">
					<span class="bpm-block__header-metric-label">{{ metric.label }}</span>
					<span v-if="metric.isLoading" class="bpm-block__header-metric-skeleton" aria-hidden="true"></span>
					<strong v-else class="bpm-block__header-metric-value">{{ metric.value }}</strong>
				</div>
			</div>

			<div class="bpm-block__action-bar" role="toolbar" aria-label="Керування графіком">
				<div v-if="showControls" class="bpm-block__bar-group bpm-block__bar-group_cta">
					<button class="bpm-block__cta bpm-block__cta_measure"
						:class="{ 'bpm-block__cta_active': viewModel.isMeasurementActive() }" type="button"
						:aria-label="measurementToggleLabel" :aria-pressed="viewModel.isMeasurementActive()"
						:disabled="viewModel.isMeasurementToggleDisabled()" @click="viewModel.toggleMeasurement()">
						<span class="bpm-block__cta-glyph" aria-hidden="true">
							<span v-if="viewModel.isMeasurementActive()" class="bpm-block__glyph-stop"></span>
							<span v-else class="bpm-block__glyph-play"></span>
						</span>
					</button>
					<button class="bpm-block__cta bpm-block__cta_record"
						:class="{ 'bpm-block__cta_active': viewModel.isRecordingActive() }" type="button"
						:aria-label="recordingToggleLabel" :aria-pressed="viewModel.isRecordingActive()"
						:disabled="viewModel.isRecordingToggleDisabled()" @click="viewModel.toggleRecording()">
						<span class="bpm-block__cta-glyph" aria-hidden="true">
							<span v-if="viewModel.isRecordingActive()" class="bpm-block__glyph-stop"></span>
							<span v-else class="bpm-block__glyph-rec"></span>
						</span>
					</button>
				</div>

				<div v-if="showContextSelectors" class="bpm-block__bar-group bpm-block__bar-group_context">
					<label class="bpm-block__bar-select bpm-block__bar-select_inline">
						<span class="bpm-block__bar-select-heading" aria-hidden="true">
							<span class="bpm-block__select-icon bpm-block__select-icon_device"></span>
						</span>
						<select
							v-model="viewModel.state.selectedDeviceId"
							class="bpm-block__native-select"
							aria-label="Пристрій"
							:disabled="viewModel.state.status === 'measuring' || viewModel.state.status === 'recording'"
						>
							<option v-for="device in viewModel.state.devices" :key="device.id" :value="device.id">
								{{ device.id }}
							</option>
						</select>
					</label>
					<label class="bpm-block__bar-select bpm-block__bar-select_inline">
						<span class="bpm-block__bar-select-heading" aria-hidden="true">
							<span class="bpm-block__select-icon bpm-block__select-icon_participant"></span>
						</span>
						<select
							v-model="viewModel.state.selectedParticipantId"
							class="bpm-block__native-select"
							aria-label="Учасник"
							:disabled="viewModel.state.status === 'measuring' || viewModel.state.status === 'recording'"
						>
							<option
								v-for="participant in viewModel.state.participants"
								:key="participant.id"
								:value="participant.id"
							>
								{{ participant.name }}
							</option>
						</select>
					</label>
					<label v-if="showRecordingSelect" class="bpm-block__bar-select bpm-block__bar-select_inline">
						<span class="bpm-block__bar-select-heading" aria-hidden="true">
							<span class="bpm-block__select-icon bpm-block__select-icon_recording"></span>
							<span class="bpm-block__bar-select-label">Запис</span>
						</span>
						<select
							class="bpm-block__native-select"
							:value="viewModel.state.recordingId ?? ''"
							aria-label="Запис"
							:disabled="viewModel.state.status === 'measuring' || viewModel.state.status === 'recording'"
							@change="handleRecordingNativeSelect"
						>
							<option
								v-for="recording in viewModel.state.recordings"
								:key="recording.id"
								:value="recording.id"
							>
								{{ recording.name }}
							</option>
						</select>
					</label>
				</div>

				<div
					v-if="showContextSelectors || showExport"
					class="bpm-block__bar-group bpm-block__bar-group_end"
				>
					<label v-if="showContextSelectors" class="bpm-block__ml-checkbox">
						<input
							v-model="mlTrainingChecked"
							type="checkbox"
							:disabled="viewModel.state.status === 'recording'"
						/>
						<span class="bpm-block__ml-box" aria-hidden="true"></span>
						<span>Додати в датасет</span>
					</label>
					<template v-if="showExport">
						<button class="bpm-block__export-button" type="button" aria-label="Експорт у CSV"
							:disabled="isRecordingExportDisabled"
							@click="downloadSelectedRecording('csv')">
							<span class="bpm-block__export-icon" aria-hidden="true"></span>
						</button>
						<button v-if="isRecordingViewMode" class="bpm-block__exit-view-button" type="button"
							aria-label="Вийти з перегляду"
							@click="exitRecordingView()">
							<span class="bpm-block__exit-view-icon" aria-hidden="true"></span>
						</button>
					</template>
				</div>
			</div>
		</Teleport>

		<Teleport v-if="isPageHeaderActionTargetReady" to=".app-layout__status-slot">
			<div class="bpm-block__status-banner" :class="`bpm-block__status-banner_${statusKey}`" aria-live="polite">
				<span class="bpm-block__status-banner-text">{{ statusLabel }}</span>
			</div>
		</Teleport>

		<div class="bpm-block__body">
			<div class="bpm-block__charts-panel">
				<div class="bpm-block__charts">
					<div v-if="viewModel.state.chartData" ref="chartsScroll" class="bpm-block__charts-scroll" @wheel="handleChartWheel">
						<div class="bpm-block__charts-track" :class="`bpm-block__charts-track_${chartViewMode}`"
							:style="chartTrackStyle">
							<div v-if="isIrChartVisible" class="bpm-block__chart bpm-block__chart_primary">
								<canvas ref="irChartCanvas" class="bpm-block__canvas" />
							</div>
							<div v-if="isRedChartVisible" class="bpm-block__chart bpm-block__chart_secondary">
								<canvas ref="rChartCanvas" class="bpm-block__canvas" />
							</div>
						</div>
					</div>
					<div v-else class="bpm-block__empty-panel">
						<p class="bpm-block__empty">{{ emptyChartMessage }}</p>
					</div>
				</div>

				<div v-if="viewModel.state.chartData" class="bpm-block__chart-controls" aria-label="Керування графіком">
					<div class="bpm-block__zoom" aria-label="Масштаб графіка">
						<button class="bpm-block__zoom-button" type="button" aria-label="Зменшити масштаб"
							:disabled="!canZoomOut" @click="zoomOutChart()">
							−
						</button>
						<span class="bpm-block__zoom-value">{{ chartZoomPercent }}</span>
						<button class="bpm-block__zoom-button" type="button" aria-label="Збільшити масштаб"
							:disabled="!canZoomIn" @click="zoomInChart()">
							+
						</button>
					</div>
					<label class="bpm-block__chart-select">
						<select
							class="bpm-block__native-select"
							:value="chartViewMode"
							aria-label="Вигляд графіка"
							@change="handleChartViewNativeSelect"
						>
							<option
								v-for="option in chartViewOptions"
								:key="option.value"
								:value="option.value"
							>
								{{ option.label }}
							</option>
						</select>
					</label>

					<div class="bpm-block__timeline" aria-label="Прокрутка графіка">
						<button class="bpm-block__timeline-button" type="button" aria-label="Прокрутити ліворуч"
							:disabled="!canScrollLeft" @click="scrollChartBy(-chartScrollStep)">
							‹
						</button>
						<input class="bpm-block__timeline-track" type="range" min="0" :max="scrollMaxLeft"
							:value="scrollLeft" step="1" :disabled="isChartScrollDisabled"
							@input="handleScrollBarInput">
						<button class="bpm-block__timeline-button" type="button" aria-label="Прокрутити праворуч"
							:disabled="!canScrollRight" @click="scrollChartBy(chartScrollStep)">
							›
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
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
	type Plugin,
} from 'chart.js';
import { BPMBlockViewModel } from '~/controllers/components/BPMBlockViewModel';
import type { BPMChartDataset, PulseSample } from '~/types/components/bpm-block';
import { formatQualityLevelLabel, getQualityToneFromLevel } from '~/utils/shared';
import type { QualityLevel } from '~/types/shared/entities';

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

const props = withDefaults(defineProps<{
	studyId?: string | null
	selectedRecordingId?: string | null
	showControls?: boolean
	showExport?: boolean
	showContextSelectors?: boolean
	showRecordingMarkers?: boolean
	showRecordingSelect?: boolean
	autoLoadLastRecording?: boolean
	qualityMetricMode?: 'readiness' | 'analysis'
}>(), {
	studyId: null,
	selectedRecordingId: null,
	showControls: true,
	showExport: false,
	showContextSelectors: true,
	showRecordingMarkers: true,
	showRecordingSelect: true,
	autoLoadLastRecording: true,
	qualityMetricMode: 'readiness',
});

const emit = defineEmits<{
	recordingSelect: [recordingId: string]
}>();

const route = useRoute();
const router = useRouter();
const measurementSession = useMeasurementSession();
const viewModel = new BPMBlockViewModel(props.studyId, {
	autoLoadLastRecording: props.autoLoadLastRecording,
	restoreLiveMeasurement: !props.selectedRecordingId,
});
const irChartCanvas = ref<HTMLCanvasElement | null>(null);
const rChartCanvas = ref<HTMLCanvasElement | null>(null);
const chartsScroll = ref<HTMLDivElement | null>(null);
type BPMChartPoint = number | PulseSample;
type BPMMetricKey = 'bpm' | 'spo2' | 'signalReadiness';
type RecordingExportFormat = 'json' | 'csv';
type ChartViewMode = 'split' | 'ir' | 'r' | 'combined';
const BASE_VISIBLE_SAMPLE_COUNT = 480;
const MIN_CHART_ZOOM = 0.25;
const MAX_CHART_ZOOM = 4;
const CHART_ZOOM_STEP = 0.25;
const chartZoom = ref(1);
const chartViewMode = ref<ChartViewMode>('split');
const scrollLeft = ref(0);
const isPageHeaderActionTargetReady = ref(false);

const charts: Record<'ir' | 'r', Chart<'line', BPMChartPoint[], number> | null> = {
	ir: null,
	r: null,
};

type RecordingBoundary = {
	key: string
	label: string
	sampleIndex: number
};

const recordingBoundaryPlugin: Plugin<'line'> = {
	id: 'recordingBoundary',
	afterDatasetsDraw(chart) {
		const boundaries = getRecordingBoundaries();
		const xScale = chart.scales.x;

		if (!boundaries.length || !xScale) {
			return;
		}

		const { ctx, chartArea } = chart;
		const visibleMin = Number(xScale.min);
		const visibleMax = Number(xScale.max);

		ctx.save();
		ctx.textBaseline = 'top';
		ctx.font = '700 10px sans-serif';

		boundaries.forEach((boundary) => {
			if (boundary.sampleIndex < visibleMin || boundary.sampleIndex > visibleMax) {
				return;
			}

			const x = xScale.getPixelForValue(boundary.sampleIndex);

			if (!Number.isFinite(x) || x < chartArea.left || x > chartArea.right) {
				return;
			}

			ctx.fillStyle = 'rgba(255, 68, 68, 0.82)';
			ctx.fillRect(Math.round(x) - 2, chartArea.top, 4, chartArea.bottom - chartArea.top);

			const labelPadding = 6;
			const labelWidth = ctx.measureText(boundary.label).width + labelPadding * 2;
			const labelX = Math.min(Math.max(x + 6, chartArea.left), chartArea.right - labelWidth);

			ctx.fillStyle = 'rgba(45, 10, 14, 0.9)';
			ctx.fillRect(labelX, chartArea.top + 6, labelWidth, 18);
			ctx.fillStyle = '#ffb3b3';
			ctx.fillText(boundary.label, labelX + labelPadding, chartArea.top + 10);
		});

		ctx.restore();
	},
};

const horizontalYAxisTitlePlugin: Plugin<'line'> = {
	id: 'horizontalYAxisTitle',
	afterDraw(chart) {
		const { ctx, chartArea } = chart;

		if (!chartArea) {
			return;
		}

		const titleX = Math.max(14, chartArea.left - 34);
		const titleY = (chartArea.top + chartArea.bottom) / 2;

		ctx.save();
		ctx.fillStyle = '#aeb7c8';
		ctx.font = '700 11px sans-serif';
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.translate(titleX, titleY);
		ctx.rotate(-Math.PI / 2);
		ctx.fillText('Амплітуда PPG', 0, 0);
		ctx.restore();
	},
};

const chartViewOptions = [
	{ value: 'split', label: '2 графіки' },
	{ value: 'ir', label: 'ІК' },
	{ value: 'r', label: 'К' },
	{ value: 'combined', label: 'ІК + К' },
] as const;
const chartViewValues = new Set<ChartViewMode>(chartViewOptions.map((option) => option.value));

const showControls = computed(() => props.showControls);
const showExport = computed(() => props.showExport);
const isRecordingViewMode = computed(() => Boolean(props.selectedRecordingId));
const shouldShowMetrics = computed(() => viewModel.isMeasurementActive() || isRecordingViewMode.value);
const mlTrainingChecked = computed({
	get: () => viewModel.state.useRecordingsForMlTraining === 'true',
	set: (value: boolean) => {
		viewModel.state.useRecordingsForMlTraining = value ? 'true' : 'false';
	},
});
const measurementToggleLabel = computed(() => viewModel.isMeasurementActive() ? 'Зупинити вимір' : 'Почати вимір');
const recordingToggleLabel = computed(() => viewModel.isRecordingActive() ? 'Зупинити запис' : 'Почати запис');
const emptyChartMessage = computed(() => {
	return isRecordingViewMode.value
		? 'Графіки запису не завантажено'
		: 'Графіки відсутні. Почніть вимірювання';
});

const statusKey = computed(() => {
	if (isRecordingViewMode.value) {
		return 'viewing';
	}

	if (viewModel.isRecordingActive()) {
		return 'recording';
	}

	if (viewModel.isMeasurementActive()) {
		return 'measuring';
	}

	if (viewModel.state.isActionRunning) {
		return 'pending';
	}

	return 'idle';
});

const statusLabel = computed(() => {
	switch (statusKey.value) {
		case 'viewing':
			return 'Режим перегляду';
		case 'recording':
			return 'Запис триває';
		case 'measuring':
			return 'Вимірювання активне';
		case 'pending':
			return 'Опрацювання…';
		default:
			return 'Готово';
	}
});
const qualityMetricLabel = computed(() => {
	return props.qualityMetricMode === 'analysis' ? 'Якість' : 'Стабільність';
});

const metricCards = computed(() => {
	return [
		createMetricCard('bpm', 'BPM', 'bpm-block__metric-icon_bpm'),
		createMetricCard('spo2', 'SpO2', 'bpm-block__metric-icon_spo2'),
		createMetricCard('signalReadiness', qualityMetricLabel.value, 'bpm-block__metric-icon_signal'),
	];
});

const isRecordingExportDisabled = computed(() => {
	return viewModel.state.isLoading || viewModel.state.isActionRunning || !viewModel.canExportSelectedRecording();
});

const chartTrackStyle = computed(() => {
	return {
		width: '100%',
	};
});

const chartZoomPercent = computed(() => `${Math.round(chartZoom.value * 100)}%`);
const canZoomIn = computed(() => chartZoom.value < MAX_CHART_ZOOM);
const canZoomOut = computed(() => chartZoom.value > MIN_CHART_ZOOM);
const totalSampleCount = computed(() => getPrimaryChartDataLength());
const visibleSampleCount = computed(() => {
	if (!totalSampleCount.value) {
		return 0;
	}

	const nextCount = Math.round(BASE_VISIBLE_SAMPLE_COUNT / chartZoom.value);

	return Math.min(totalSampleCount.value, Math.max(24, nextCount));
});
const scrollMaxLeft = computed(() => Math.max(totalSampleCount.value - visibleSampleCount.value, 0));
const chartScrollStep = computed(() => Math.max(1, Math.round(visibleSampleCount.value * 0.66)));
const isChartScrollDisabled = computed(() => viewModel.isMeasurementActive() || !viewModel.state.chartData || scrollMaxLeft.value <= 0);
const hasHorizontalOverflow = computed(() => Boolean(viewModel.state.chartData) && scrollMaxLeft.value > 0 && !viewModel.isMeasurementActive());
const canScrollLeft = computed(() => !isChartScrollDisabled.value && scrollLeft.value > 0);
const canScrollRight = computed(() => !isChartScrollDisabled.value && scrollLeft.value < scrollMaxLeft.value);
const isIrChartVisible = computed(() => chartViewMode.value !== 'r');
const isRedChartVisible = computed(() => chartViewMode.value === 'split' || chartViewMode.value === 'r');

function getChannelDisplayLabel(label: string) {
	const normalized = label.trim().toLowerCase();

	if (normalized === 'ir') {
		return 'Інфрачервоний (ІК)';
	}

	if (normalized === 'r' || normalized === 'red') {
		return 'Червоний (К)';
	}

	return label || '—';
}

function getChartOptions(data: number[], usesSampleObjects: boolean, xRange: { min: number; max: number } | null): ChartOptions<'line'> {
	const yRange = getYRange(data);

	return {
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		layout: {
			padding: {
				top: 8,
				left: 12,
			},
		},
		interaction: {
			intersect: false,
			mode: 'index',
		},
		plugins: {
			legend: {
				display: true,
				position: 'top',
				align: 'start',
				labels: {
					color: '#cfd6e4',
					boxWidth: 10,
					boxHeight: 10,
					padding: 14,
					font: {
						size: 11,
						weight: 700,
					},
					generateLabels(chart) {
						return (chart.data.datasets ?? []).map((dataset, index) => ({
							fontColor: String(dataset.borderColor ?? '#cfd6e4'),
							text: getChannelDisplayLabel(String(dataset.label ?? '')),
							fillStyle: String(dataset.borderColor ?? '#cfd6e4'),
							strokeStyle: String(dataset.borderColor ?? '#cfd6e4'),
							lineWidth: 0,
							hidden: !chart.isDatasetVisible(index),
							datasetIndex: index,
						}));
					},
				},
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
				title: {
					display: true,
					text: 'Семпл',
					color: '#aeb7c8',
					font: {
						size: 11,
						weight: 700,
					},
					padding: {
						top: 8,
					},
				},
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
				title: {
					display: false,
					color: '#aeb7c8',
					font: {
						size: 11,
						weight: 700,
					},
					padding: {
						bottom: 8,
					},
				},
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

function createMetricCard(key: BPMMetricKey, label: string, iconClass: string) {
	const value = getMetricRawValue(key);
	const qualityTone = key === 'signalReadiness' ? getQualityToneFromLevel(value as QualityLevel | null) : null;

	return {
		key,
		label,
		iconClass,
		toneClass: qualityTone ? `bpm-block__metric_quality-${qualityTone}` : null,
		value: getMetricValue(key),
		isLoading: isMetricLoading(key),
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

function getMetricRawValue(metric: BPMMetricKey) {
	if (metric === 'bpm') {
		return viewModel.state.bpm;
	}

	if (metric === 'spo2') {
		return viewModel.state.spo2;
	}

	return viewModel.state.signalReadiness;
}

function getMetricValue(metric: BPMMetricKey) {
	const value = getMetricRawValue(metric);

	if (!hasMetricValue(metric, value)) {
		return '--';
	}

	if (metric === 'signalReadiness') {
		return formatQualityLevelLabel(value as QualityLevel);
	}

	if (metric === 'spo2') {
		return `${Math.round(Number(value))}%`;
	}

	return String(Math.round(Number(value)));
}

function isMetricLoading(metric: BPMMetricKey) {
	const value = getMetricRawValue(metric);

	if (hasMetricValue(metric, value)) {
		return false;
	}

	if (viewModel.state.isLoading || viewModel.state.isActionRunning) {
		return true;
	}

	if (viewModel.state.status === 'measuring' || viewModel.state.status === 'recording') {
		return true;
	}

	return Boolean(viewModel.state.recordingId && !viewModel.state.chartData && !viewModel.state.error);
}

function hasMetricValue(metric: BPMMetricKey, value: number | QualityLevel | null) {
	if (metric === 'signalReadiness') {
		return value === 'high' || value === 'medium' || value === 'low';
	}

	return Number.isFinite(value);
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
	const start = scrollLeft.value;
	const end = start + visibleSampleCount.value;

	return {
		labels: chartData?.labels?.slice(start, end),
		data: dataset.data.slice(start, end),
	};
}

function getPrimaryChartDataLength() {
	const dataset = getDatasetByChannel('ir') ?? getDatasetByChannel('r') ?? viewModel.state.chartData?.datasets[0] ?? null;

	return dataset?.data.length ?? 0;
}

function getChartDataset(channel: 'ir' | 'r') {
	const dataset = getDatasetByChannel(channel);

	if (!dataset) {
		return null;
	}

	const defaultColor = channel === 'ir' ? '#8b5cf6' : '#e85d75';
	const fillColor = channel === 'ir' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(232, 93, 117, 0.18)';
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

	const chartDatasets = channel === 'ir' && chartViewMode.value === 'combined'
		? [getChartDataset('ir'), getChartDataset('r')].filter((dataset): dataset is NonNullable<ReturnType<typeof getChartDataset>> => Boolean(dataset))
		: [getChartDataset(channel)].filter((dataset): dataset is NonNullable<ReturnType<typeof getChartDataset>> => Boolean(dataset));

	if (!chartDatasets.length) {
		return null;
	}

	const values = chartDatasets.flatMap((dataset) => dataset.values);
	const primaryDataset = chartDatasets[0];

	return {
		type: 'line',
		data: {
			labels: primaryDataset.labels,
			datasets: chartDatasets.map((dataset) => dataset.dataset),
		},
		options: getChartOptions(values, primaryDataset.usesSampleObjects, primaryDataset.xRange),
		plugins: [recordingBoundaryPlugin, horizontalYAxisTitlePlugin],
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
	renderChart('ir', isIrChartVisible.value ? irChartCanvas.value : null);
	renderChart('r', isRedChartVisible.value && chartViewMode.value !== 'combined' ? rChartCanvas.value : null);
}

function resetChartScrollPosition() {
	scrollLeft.value = 0;
}

function clampChartZoom(value: number) {
	return Math.min(MAX_CHART_ZOOM, Math.max(MIN_CHART_ZOOM, Math.round(value * 100) / 100));
}

function zoomInChart() {
	chartZoom.value = clampChartZoom(chartZoom.value + CHART_ZOOM_STEP);
}

function zoomOutChart() {
	chartZoom.value = clampChartZoom(chartZoom.value - CHART_ZOOM_STEP);
}

function setChartViewMode(mode: ChartViewMode) {
	chartViewMode.value = mode;
	resetChartScrollPosition();
	nextTick(() => {
		renderCharts();
		syncScrollMetrics();
	});
}

function handleChartViewSelect(value: string | number | null) {
	if (!chartViewValues.has(value as ChartViewMode)) {
		return;
	}

	setChartViewMode(value as ChartViewMode);
}

function handleChartViewNativeSelect(event: Event) {
	handleChartViewSelect((event.target as HTMLSelectElement).value);
}

function handleRecordingNativeSelect(event: Event) {
	const recordingId = (event.target as HTMLSelectElement).value;

	viewModel.state.recordingId = recordingId;
	handleRecordingSelect(recordingId);
}

function scrollChartBy(delta: number) {
	if (isChartScrollDisabled.value) {
		return;
	}

	scrollLeft.value = Math.min(scrollMaxLeft.value, Math.max(0, scrollLeft.value + delta));
}

function handleChartWheel(event: WheelEvent) {
	if (isChartScrollDisabled.value) {
		return;
	}

	event.preventDefault();
	const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
	scrollChartBy(Math.round(delta));
}

function getRecordingBoundaries(): RecordingBoundary[] {
	if (!props.showRecordingMarkers) {
		return [];
	}

	const markers = viewModel.state.recordingMarkers;

	if (!markers.length) {
		return [];
	}

	const boundaries: RecordingBoundary[] = [];

	markers.forEach((marker) => {
		const markerId = getRecordingMarkerLabel(marker.recordingId);

		if (Number.isFinite(marker.startSampleIndex)) {
			boundaries.push({
				key: `${marker.recordingId}:start`,
				label: `Старт запису ${markerId}`,
				sampleIndex: Number(marker.startSampleIndex),
			});
		}

		if (Number.isFinite(marker.endSampleIndex)) {
			boundaries.push({
				key: `${marker.recordingId}:end`,
				label: `Кінець запису ${markerId}`,
				sampleIndex: Number(marker.endSampleIndex),
			});
		}
	});

	return boundaries;
}

function getRecordingMarkerLabel(recordingId: string) {
	return recordingId.length > 14 ? recordingId.slice(-8) : recordingId;
}

function syncScrollMetrics() {
	if (viewModel.isMeasurementActive()) {
		return;
	}

	scrollLeft.value = Math.min(scrollLeft.value, scrollMaxLeft.value);
}

function handleScrollBarInput(event: Event) {
	if (isChartScrollDisabled.value) {
		return;
	}

	const nextValue = Number((event.target as HTMLInputElement).value);

	scrollLeft.value = Math.min(scrollMaxLeft.value, Math.max(0, Math.round(nextValue)));
}

function handleRecordingSelect(value: string | number | null) {
	if (value === null || value === '') {
		return;
	}

	const recordingId = String(value);

	emit('recordingSelect', recordingId);
	resetChartScrollPosition();
	void viewModel.loadRecording(recordingId);
}

function downloadSelectedRecording(format: RecordingExportFormat) {
	const exportUrl = viewModel.getRecordingExportUrl(format);

	if (!exportUrl || typeof document === 'undefined') {
		return;
	}

	const link = document.createElement('a');
	link.href = exportUrl;
	link.target = '_blank';
	link.rel = 'noopener';
	link.click();
}

function exitRecordingView() {
	const nextQuery = { ...route.query };

	delete nextQuery.recording;
	void router.replace({
		path: route.path,
		query: nextQuery,
	});
}

function syncSelectedRecordingFromProp(recordingId: string | null | undefined) {
	if (!recordingId || recordingId === viewModel.state.recordingId) {
		return;
	}

	resetChartScrollPosition();
	void viewModel.loadRecording(recordingId);
}

onMounted(() => {
	isPageHeaderActionTargetReady.value = true;
	measurementSession.register(viewModel);
	viewModel.initialize().then(() => {
		syncSelectedRecordingFromProp(props.selectedRecordingId);
	});
	renderCharts();
	window.addEventListener('resize', syncScrollMetrics);
});

onBeforeUnmount(() => {
	isPageHeaderActionTargetReady.value = false;
	measurementSession.unregister(viewModel);
	charts.ir?.destroy();
	charts.r?.destroy();
	window.removeEventListener('resize', syncScrollMetrics);
	viewModel.destroy();
});

watch(
	() => viewModel.state.chartData,
	() => {
		syncScrollMetrics();
		renderCharts();
		nextTick(() => {
			syncScrollMetrics();
		});
	},
	{ deep: true, flush: 'post' },
);

watch(
	() => props.studyId,
	(studyId) => {
		viewModel.setStudyId(studyId);
	},
);

watch(
	() => props.selectedRecordingId,
	(recordingId) => {
		syncSelectedRecordingFromProp(recordingId);
	},
);

watch(
	() => chartZoom.value,
	() => {
		syncScrollMetrics();
		renderCharts();
		nextTick(() => {
			syncScrollMetrics();
		});
	},
);

watchEffect(() => {
	if (viewModel.isMeasurementActive()) {
		scrollLeft.value = scrollMaxLeft.value;
	}
});

watch(
	() => scrollLeft.value,
	() => {
		renderCharts();
	},
);
</script>

<style scoped lang="scss">
@use "~/assets/styles/components/BPMBlock";
</style>
