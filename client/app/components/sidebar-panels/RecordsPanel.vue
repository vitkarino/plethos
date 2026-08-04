<template>
	<Panel content-class="records-panel">
		<p v-if="viewModel.state.error" class="records-panel__message records-panel__message_error">
			{{ viewModel.state.error }}
		</p>

		<p v-else-if="viewModel.state.isLoading" class="records-panel__message">
			Завантаження записів...
		</p>

		<p v-else-if="!viewModel.state.rows.length" class="records-panel__message">
			Для цього дослідження ще немає завершених записів.
		</p>

		<div v-else class="records-panel__list">
			<NuxtLink
				v-for="row in viewModel.state.rows"
				:key="row.recording.id"
				class="records-panel__item"
				:class="{ 'records-panel__item_active': row.recording.id === activeRecordingId }"
				:to="recordingRoute(row.recording.id)"
				:aria-current="row.recording.id === activeRecordingId ? 'page' : undefined"
				@click="emit('select')"
			>
				<span class="records-panel__item-top">
					<strong :aria-label="viewModel.title(row)">{{ viewModel.title(row) }}</strong>
				</span>
				<span class="records-panel__item-facts">
					<span class="records-panel__fact records-panel__fact_date">
						<span class="records-panel__fact-icon" aria-hidden="true"></span>
						{{ viewModel.formatDate(row.recording.time.started_at) }}
					</span>
					<span class="records-panel__fact records-panel__fact_duration">
						<span class="records-panel__fact-icon" aria-hidden="true"></span>
						{{ viewModel.formatDuration(row.recording) }}
					</span>
					<span class="records-panel__fact records-panel__fact_samples">
						<span class="records-panel__fact-icon" aria-hidden="true"></span>
						{{ viewModel.formatSamples(row.recording) }}
					</span>
				</span>
				<span class="records-panel__metrics">
					<span class="records-panel__metric records-panel__metric_bpm">
						<span>BPM</span>
						<strong>{{ viewModel.metricValue(row, 'bpm') }}</strong>
					</span>
					<span class="records-panel__metric records-panel__metric_spo2">
						<span>SpO2</span>
						<strong>{{ viewModel.metricValue(row, 'spo2') }}</strong>
					</span>
					<span
						class="records-panel__metric records-panel__metric_quality"
						:class="`records-panel__metric_quality-${viewModel.qualityTone(row)}`"
					>
						<span>Якість</span>
						<strong>{{ viewModel.metricValue(row, 'quality') }}</strong>
					</span>
					<span class="records-panel__metric records-panel__metric_training">
						<span>Тренування ML</span>
						<strong
							class="records-panel__training-state"
							:class="{
								'records-panel__training-state_enabled': row.recording.use_for_ml_training,
								'records-panel__training-state_disabled': !row.recording.use_for_ml_training,
							}"
							:aria-label="viewModel.trainingLabel(row.recording)"
						></strong>
					</span>
				</span>
			</NuxtLink>
		</div>
	</Panel>
</template>

<script setup lang="ts">
import Panel from '~/components/Panel.vue';
import { RecordsPanelViewModel } from '~/controllers/components/RecordsPanelViewModel';
import { ApiModel } from '~/models/ApiModel';

const props = withDefaults(defineProps<{
	studyId?: string | null
	dashboardPath?: string
	activeRecordingId?: string | null
}>(), {
	studyId: null,
	dashboardPath: '',
	activeRecordingId: null,
});

const emit = defineEmits<{
	select: []
}>();

const route = useRoute();
const viewModel = new RecordsPanelViewModel();
const api = new ApiModel();

function reload() {
	void viewModel.load(props.studyId ?? null);
}

function recordingRoute(recordingId: string) {
	if (props.dashboardPath) {
		return {
			path: props.dashboardPath,
			query: {
				recording: recordingId,
			},
		};
	}

	return {
		path: route.path,
		query: {
			...route.query,
			recording: recordingId,
		},
	};
}

function downloadAllRecordingsCsv() {
	if (typeof document === 'undefined') {
		return;
	}

	const link = document.createElement('a');
	link.href = api.getRecordingsExportUrl({
		study_id: props.studyId ?? undefined,
		status: 'completed',
	}, 'csv');
	link.target = '_blank';
	link.rel = 'noopener';
	link.click();
}

watch(
	() => props.studyId,
	() => reload(),
	{ immediate: true },
);

defineExpose({
	downloadAllRecordingsCsv,
	reload,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/core/variables" as *;

@mixin icon-mask($svg) {
	-webkit-mask: url($svg) center / contain no-repeat;
	mask: url($svg) center / contain no-repeat;
}

$icon-clock: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/g%3E%3C/svg%3E";
$icon-calendar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M8 2v4m8-4v4M3 10h18'/%3E%3Crect width='18' height='18' x='3' y='4' rx='2'/%3E%3C/g%3E%3C/svg%3E";
$icon-samples: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 12h3l2-5l4 10l3-7l2 2h4'/%3E%3C/svg%3E";
$icon-check: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.4' d='m20 6L9 17l-5-5'/%3E%3C/svg%3E";
$icon-x: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.4' d='M18 6L6 18M6 6l12 12'/%3E%3C/svg%3E";

.records-panel__message {
	margin: 0;
	color: $color-text-secondary;
	font-size: 11pt;
	line-height: 1.35;
}

.records-panel__message_error {
	color: #ff9b9b;
}

.records-panel__list {
	display: flex;
	flex-direction: column;
	gap: 0.55em;
	min-width: 0;
}

.records-panel__item {
	display: flex;
	flex-direction: column;
	gap: 0.45em;
	min-width: 0;
	padding: 0.8em;
	border-radius: $radius-control;
	background: rgba(255, 255, 255, 0.035);
	color: $color-text-primary;
	text-decoration: none;
	transition:
		background-color 160ms ease,
		color 160ms ease;
}

.records-panel__item:hover,
.records-panel__item:focus-visible {
	background: rgba($color-selected, 0.08);
	color: $color-selected;
	outline: none;
}

.records-panel__item_active {
	background: rgba($color-selected, 0.12);
	color: $color-selected;
}

.records-panel__item-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.65em;
	min-width: 0;
}

.records-panel__item-top strong,
.records-panel__item-facts,
.records-panel__fact,
.records-panel__metric {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.records-panel__item-top strong {
	font-size: 11pt;
	font-weight: 700;
	line-height: 1.2;
	white-space: nowrap;
}

.records-panel__item-facts {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-start;
	gap: 0.7em;
	color: $color-text-secondary;
	font-size: 9.5pt;
	line-height: 1.25;
}

.records-panel__fact {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
}

.records-panel__fact-icon {
	display: block;
	flex: 0 0 1em;
	width: 1em;
	height: 1em;
	background: currentColor;
	opacity: 0.75;
}

.records-panel__fact_date .records-panel__fact-icon {
	@include icon-mask($icon-calendar);
}

.records-panel__fact_duration .records-panel__fact-icon {
	@include icon-mask($icon-clock);
}

.records-panel__fact_samples .records-panel__fact-icon {
	@include icon-mask($icon-samples);
}

.records-panel__metrics {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4em;
	min-width: 0;
}

.records-panel__metric {
	--metric-accent: #ffffff;

	display: inline-flex;
	align-items: center;
	gap: 0.28em;
	width: fit-content;
	min-height: 2em;
	padding: 0 0.45em;
	border: 0;
	border-radius: 0.45em;
	background: rgba(255, 255, 255, 0.035);
	color: $color-text-secondary;
	font-size: 8.5pt;
	line-height: 1;
}

.records-panel__metric_quality-high {
	--metric-accent: #78e2c0;
}

.records-panel__metric_quality-medium {
	--metric-accent: #f6c667;
}

.records-panel__metric_quality-low {
	--metric-accent: #ff7878;
}

.records-panel__metric_quality-neutral {
	--metric-accent: #ffffff;
}

.records-panel__metric strong {
	margin-left: 0.4em;
	color: var(--metric-accent);
	font-family: $font-data;
	font-size: 9pt;
	font-weight: 400;
}

.records-panel__training-state {
	display: block;
	width: 1em;
	height: 1em;
	background: currentColor;
}

.records-panel__training-state_enabled {
	color: #78e2c0;
	@include icon-mask($icon-check);
}

.records-panel__training-state_disabled {
	color: #ff7878;
	@include icon-mask($icon-x);
}
</style>
