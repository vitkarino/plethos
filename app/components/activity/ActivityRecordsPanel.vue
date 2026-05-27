<template>
	<section class="activity-records-panel">
		<p v-if="viewModel.state.error" class="activity-records-panel__message activity-records-panel__message_error">
			{{ viewModel.state.error }}
		</p>

		<p v-else-if="viewModel.state.isLoading" class="activity-records-panel__message">
			Завантаження записів...
		</p>

		<p v-else-if="!viewModel.state.rows.length" class="activity-records-panel__message">
			Для цього дослідження ще немає завершених записів.
		</p>

		<div v-else class="activity-records-panel__list">
			<NuxtLink
				v-for="row in viewModel.state.rows"
				:key="row.recording.id"
				class="activity-records-panel__item"
				:class="{ 'activity-records-panel__item_active': row.recording.id === activeRecordingId }"
				:to="recordingRoute(row.recording.id)"
				:aria-current="row.recording.id === activeRecordingId ? 'page' : undefined"
				@click="emit('select')"
			>
				<span class="activity-records-panel__item-top">
					<strong :aria-label="viewModel.title(row)">{{ viewModel.title(row) }}</strong>
				</span>
				<span class="activity-records-panel__item-facts">
					<span class="activity-records-panel__fact activity-records-panel__fact_date">
						<span class="activity-records-panel__fact-icon" aria-hidden="true"></span>
						{{ viewModel.formatDate(row.recording.time.started_at) }}
					</span>
					<span class="activity-records-panel__fact activity-records-panel__fact_duration">
						<span class="activity-records-panel__fact-icon" aria-hidden="true"></span>
						{{ viewModel.formatDuration(row.recording) }}
					</span>
					<span class="activity-records-panel__fact activity-records-panel__fact_samples">
						<span class="activity-records-panel__fact-icon" aria-hidden="true"></span>
						{{ viewModel.formatSamples(row.recording) }}
					</span>
				</span>
				<span class="activity-records-panel__metrics">
					<span class="activity-records-panel__metric activity-records-panel__metric_bpm">
						<span class="activity-records-panel__metric-icon" aria-hidden="true"></span>
						<span>BPM</span>
						<strong>{{ viewModel.metricValue(row, 'bpm') }}</strong>
					</span>
					<span class="activity-records-panel__metric activity-records-panel__metric_spo2">
						<span class="activity-records-panel__metric-icon" aria-hidden="true"></span>
						<span>SpO2</span>
						<strong>{{ viewModel.metricValue(row, 'spo2') }}</strong>
					</span>
					<span
						class="activity-records-panel__metric activity-records-panel__metric_quality"
						:class="`activity-records-panel__metric_quality-${viewModel.qualityTone(row)}`"
					>
						<span class="activity-records-panel__metric-icon" aria-hidden="true"></span>
						<span>Якість</span>
						<strong>{{ viewModel.metricValue(row, 'quality') }}</strong>
					</span>
				</span>
			</NuxtLink>
		</div>
	</section>
</template>

<script setup lang="ts">
import { ActivityRecordsPanelViewModel } from '~/controllers/components/ActivityRecordsPanelViewModel';

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
const viewModel = new ActivityRecordsPanelViewModel();

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

watch(
	() => props.studyId,
	() => reload(),
	{ immediate: true },
);

defineExpose({
	reload,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/core/variables" as *;

@mixin icon-mask($svg) {
	-webkit-mask: url($svg) center / contain no-repeat;
	mask: url($svg) center / contain no-repeat;
}

$icon-clock: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/g%3E%3C/svg%3E";
$icon-calendar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M8 2v4m8-4v4M3 10h18'/%3E%3Crect width='18' height='18' x='3' y='4' rx='2'/%3E%3C/g%3E%3C/svg%3E";
$icon-samples: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 12h3l2-5l4 10l3-7l2 2h4'/%3E%3C/svg%3E";
$icon-heart-pulse: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 9.5a5.5 5.5 0 0 1 9.59-3.676.56.56 0 0 0 .82 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'/%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3.22 12H9.5l.5-1l2 4.5l2-7l1.5 3.5h5.27'/%3E%3C/svg%3E";
$icon-droplets: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M7 16.3c2.2 0 4-1.83 4-4.05c0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05'/%3E%3Cpath d='M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97'/%3E%3C/g%3E%3C/svg%3E";
$icon-signal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 20h.01M7 20v-4m5 4v-8m5 8V8m5 12V4'/%3E%3C/svg%3E";

.activity-records-panel {
	display: flex;
	flex-direction: column;
	gap: 0.75em;
	min-height: 100%;
	width: 100%;
}

.activity-records-panel__message {
	margin: 0;
	color: $color-text-secondary;
	font-size: 11pt;
	line-height: 1.35;
}

.activity-records-panel__message_error {
	color: #ff9b9b;
}

.activity-records-panel__list {
	display: flex;
	flex-direction: column;
	gap: 0.55em;
	min-width: 0;
}

.activity-records-panel__item {
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

.activity-records-panel__item:hover,
.activity-records-panel__item:focus-visible {
	background: rgba($color-selected, 0.08);
	color: $color-selected;
	outline: none;
}

.activity-records-panel__item_active {
	background: rgba($color-selected, 0.12);
	color: $color-selected;
}

.activity-records-panel__item-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.65em;
	min-width: 0;
}

.activity-records-panel__item-top strong,
.activity-records-panel__item-facts,
.activity-records-panel__fact,
.activity-records-panel__metric {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.activity-records-panel__item-top strong {
	position: relative;
	font-size: 11pt;
	font-weight: 700;
	line-height: 1.2;
	white-space: nowrap;
}

.activity-records-panel__item-top strong::after {
	content: "";
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 2.6em;
	background: linear-gradient(90deg, rgba(13, 13, 13, 0), #171717 78%);
	pointer-events: none;
}

.activity-records-panel__item:hover .activity-records-panel__item-top strong::after,
.activity-records-panel__item:focus-visible .activity-records-panel__item-top strong::after,
.activity-records-panel__item_active .activity-records-panel__item-top strong::after {
	background: linear-gradient(90deg, rgba(31, 31, 31, 0), #252525 78%);
}

.activity-records-panel__item-facts {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-start;
	gap: 0.7em;
	color: $color-text-secondary;
	font-size: 9.5pt;
	line-height: 1.25;
}

.activity-records-panel__fact {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
}

.activity-records-panel__fact-icon {
	display: block;
	flex: 0 0 1em;
	width: 1em;
	height: 1em;
	background: currentColor;
	opacity: 0.75;
}

.activity-records-panel__fact_date .activity-records-panel__fact-icon {
	@include icon-mask($icon-calendar);
}

.activity-records-panel__fact_duration .activity-records-panel__fact-icon {
	@include icon-mask($icon-clock);
}

.activity-records-panel__fact_samples .activity-records-panel__fact-icon {
	@include icon-mask($icon-samples);
}

.activity-records-panel__metrics {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4em;
	min-width: 0;
}

.activity-records-panel__metric {
	--metric-accent: #ffffff;

	display: inline-flex;
	align-items: center;
	gap: 0.28em;
	width: fit-content;
	min-height: 2em;
	padding: 0 0.45em;
	border: 1px solid rgba(255, 255, 255, 0.09);
	border-radius: 0.45em;
	background: rgba(255, 255, 255, 0.035);
	color: $color-text-secondary;
	font-size: 8.5pt;
	line-height: 1;
}

.activity-records-panel__metric_quality-high {
	--metric-accent: #78e2c0;
}

.activity-records-panel__metric_quality-medium {
	--metric-accent: #f6c667;
}

.activity-records-panel__metric_quality-low {
	--metric-accent: #ff7878;
}

.activity-records-panel__metric_quality-neutral {
	--metric-accent: #ffffff;
}

.activity-records-panel__metric-icon {
	display: block;
	flex: 0 0 1em;
	width: 1em;
	height: 1em;
	background: var(--metric-accent);
}

.activity-records-panel__metric_bpm .activity-records-panel__metric-icon {
	@include icon-mask($icon-heart-pulse);
}

.activity-records-panel__metric_spo2 .activity-records-panel__metric-icon {
	@include icon-mask($icon-droplets);
}

.activity-records-panel__metric_quality .activity-records-panel__metric-icon {
	@include icon-mask($icon-signal);
}

.activity-records-panel__metric strong {
	margin-left: 0.4em;
	color: var(--metric-accent);
	font-family: $font-data;
	font-size: 9pt;
	font-weight: 400;
}

.activity-records-panel__item_active .activity-records-panel__item-meta,
.activity-records-panel__item_active .activity-records-panel__item-stats {
	color: rgba($color-selected, 0.78);
}
</style>
