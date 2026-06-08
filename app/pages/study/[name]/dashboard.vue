<template>
	<section class="study-dashboard-page">
		<BlocksGrid v-if="viewModel.state.study" class="study-dashboard-page__grid">
			<template #topLeft>
				<BPMBlock
					:key="recordingId || 'live'"
					:study-id="viewModel.state.study?.id ?? null"
					:selected-recording-id="recordingId"
					:show-controls="!isRecordingViewMode"
					:show-context-selectors="!isRecordingViewMode"
					:show-export="isRecordingViewMode"
					:show-recording-markers="!isRecordingViewMode"
					:show-recording-select="false"
					:auto-load-last-recording="false"
					:quality-metric-mode="isRecordingViewMode ? 'analysis' : 'readiness'"
				/>
			</template>
		</BlocksGrid>
		<p v-else-if="!viewModel.state.isLoading" class="study-dashboard-page__message">
			{{ viewModel.state.pageError }}
		</p>
	</section>
</template>

<script setup lang="ts">
import BlocksGrid from '~/components/BlocksGrid.vue';
import BPMBlock from '~/components/BPMBlock.vue';
import { StudyDashboardPageViewModel } from '~/controllers/pages/StudyDashboardPageViewModel';
import { PulsoApiModel } from '~/models/PulsoApiModel';
import type { QualityAnalysis, Recording } from '~/types/shared/entities';
import { formatQualityLevelLabel } from '~/utils/shared';

const route = useRoute();
const studyName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const viewModel = new StudyDashboardPageViewModel(studyName ?? '');
const api = new PulsoApiModel();
const recording = ref<Recording | null>(null);
const qualityAnalysis = ref<QualityAnalysis | null>(null);
const recordingId = computed(() => typeof route.query.recording === 'string' ? route.query.recording : '');
const isRecordingViewMode = computed(() => Boolean(recordingId.value));

usePageHeader({
	title: 'Вимірювання',
	infoTitle: computed(() => {
		if (!isRecordingViewMode.value) {
			return '';
		}

		return recording.value
			? formatRecordingMetadata(recording.value, qualityAnalysis.value)
			: 'Метадані запису завантажуються...';
	}),
});

viewModel.initialize();

watch(
	recordingId,
	(value) => {
		recording.value = null;
		qualityAnalysis.value = null;

		if (!value) {
			return;
		}

		api.fetchRecording(value)
			.then((nextRecording) => {
				recording.value = nextRecording;
				return loadQualityAnalysis(value, nextRecording);
			})
			.catch(() => {
				recording.value = null;
				qualityAnalysis.value = null;
			});
	},
	{ immediate: true },
);

function loadQualityAnalysis(recordingId: string, nextRecording: Recording) {
	const applyAnalysis = (analysis: QualityAnalysis) => {
		qualityAnalysis.value = analysis;
	};

	if (nextRecording.quality_analysis_id) {
		return api.fetchQualityAnalysis(recordingId)
			.then(applyAnalysis)
			.catch(() => api.runQualityAnalysis(recordingId).then(applyAnalysis).catch(() => undefined));
	}

	return api.runQualityAnalysis(recordingId).then(applyAnalysis).catch(() => undefined);
}

function formatRecordingMetadata(value: Recording, analysis: QualityAnalysis | null) {
	return [
		`Назва запису: ${value.name || value.id}`,
		`ID запису: ${value.id}`,
		`Початок: ${formatDateTime(value.time.started_at)}`,
		`Завершення: ${value.time.finished_at ? formatDateTime(value.time.finished_at) : '--'}`,
		`Тривалість: ${formatDuration(value.time.duration_ms)}`,
		`Семпли: ${formatNumber(value.samples_count)}`,
		`ML-аналіз: ${formatMlAnalysisStatus(value)}`,
		`Якість ML: ${formatMlQualityLevel(value, analysis)}`,
		`Впевненість ML: ${formatMlQualityConfidence(value, analysis)}`,
	].join('\n');
}

function formatMlQualityLevel(value: Recording, analysis: QualityAnalysis | null) {
	if (!analysis) {
		return value.quality_analysis_id ? 'завантажується...' : '--';
	}

	return formatQualityLevelLabel(analysis.quality_result.level);
}

function formatMlQualityConfidence(value: Recording, analysis: QualityAnalysis | null) {
	const score = analysis?.quality_result.score;

	if (!Number.isFinite(score)) {
		return value.quality_analysis_id ? 'завантажується...' : '--';
	}

	return `${Math.round(Number(score) * 100)}%`;
}

function formatMlAnalysisStatus(value: Recording) {
	return value.quality_analysis_id ? 'готовий' : 'не виконано';
}

function formatDateTime(value: string) {
	return new Date(value).toLocaleString('uk-UA', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

function formatDuration(durationMs: number | null) {
	if (durationMs === null) {
		return '--';
	}

	const seconds = Math.round(durationMs / 1000);

	return `${seconds} с`;
}

function formatNumber(value: number | null) {
	return value === null ? '--' : new Intl.NumberFormat('uk-UA').format(value);
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/study-dashboard";
</style>
