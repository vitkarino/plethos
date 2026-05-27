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
import type { Recording } from '~/types/shared/entities';

const route = useRoute();
const studyName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const viewModel = new StudyDashboardPageViewModel(studyName ?? '');
const api = new PulsoApiModel();
const recording = ref<Recording | null>(null);
const recordingId = computed(() => typeof route.query.recording === 'string' ? route.query.recording : '');
const isRecordingViewMode = computed(() => Boolean(recordingId.value));

usePageHeader({
	title: 'Вимірювання',
	infoTooltip: computed(() => {
		if (!isRecordingViewMode.value) {
			return '';
		}

		return recording.value ? formatRecordingMetadata(recording.value) : 'Метадані запису завантажуються...';
	}),
});

viewModel.initialize();

watch(
	recordingId,
	(value) => {
		recording.value = null;

		if (!value) {
			return;
		}

		api.fetchRecording(value)
			.then((nextRecording) => {
				recording.value = nextRecording;
			})
			.catch(() => {
				recording.value = null;
			});
	},
	{ immediate: true },
);

function formatRecordingMetadata(value: Recording) {
	return [
		`ID: ${value.id}`,
		`Вимірювання: ${value.measurement_id}`,
		`Статус: ${formatStatus(value.status)}`,
		`Початок: ${formatDateTime(value.time.started_at)}`,
		`Завершення: ${value.time.finished_at ? formatDateTime(value.time.finished_at) : '--'}`,
		`Тривалість: ${formatDuration(value.time.duration_ms)}`,
		`Семпли: ${formatNumber(value.samples_count)}`,
		`Діапазон: ${value.sample_range.start_index}-${value.sample_range.end_index ?? '--'}`,
		`Аналіз якості: ${value.quality_analysis_id ?? '--'}`,
		`ML training: ${value.use_for_ml_training ? 'так' : 'ні'}`,
	].join('\n');
}

function formatStatus(status: Recording['status']) {
	const labels: Record<Recording['status'], string> = {
		active: 'активний',
		completed: 'готовий',
		failed: 'помилка',
		cancelled: 'скасований',
	};

	return labels[status] ?? status;
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
