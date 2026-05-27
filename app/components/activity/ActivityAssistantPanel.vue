<template>
	<div class="ai-page ai-page_panel">
		<section v-if="viewModel.state.isHistoryOpen" class="ai-page__history" aria-label="Історія чатів">
			<div class="ai-page__history-head">
				<span>Історія чатів</span>
				<span>{{ viewModel.state.chats.length }}</span>
			</div>
			<div v-if="viewModel.state.chats.length" class="ai-page__history-list">
				<button
					v-for="chat in viewModel.state.chats"
					:key="chat.id"
					class="ai-page__history-item"
					:class="{ 'ai-page__history-item_active': chat.id === viewModel.state.activeChatId }"
					type="button"
					@click="viewModel.selectChat(chat.id)"
				>
					<strong>{{ chat.title }}</strong>
					<span>{{ chat.recordingId }}</span>
					<small>{{ chat.messages.length }} повідомлень · {{ viewModel.formatChatDate(chat.updatedAt) }}</small>
				</button>
			</div>
			<p v-else class="ai-page__history-empty">Збережені чати з'являться після першого повідомлення.</p>
		</section>

		<div class="ai-page__feed" ref="feedRef">
			<div v-if="!viewModel.state.messages.length" class="ai-page__welcome"></div>

			<template v-else>
				<div
					v-for="(message, index) in viewModel.state.messages"
					:key="`${index}-${message.timestamp}-${message.provider.type}`"
					class="ai-bubble"
					:class="{ 'ai-bubble_user': message.provider.type === 'user' }"
				>
					<div class="ai-bubble__avatar" aria-hidden="true">
						<span v-if="message.provider.type === 'user'">Я</span>
						<span v-else class="ai-bubble__avatar-icon"></span>
					</div>
					<div class="ai-bubble__body">
						<span class="ai-bubble__meta">
							{{ message.provider.type === 'user' ? 'Ви' : message.provider.model }}
							·
							{{ formatTime(message.timestamp) }}
						</span>
						<p class="ai-bubble__text">{{ message.message }}</p>
					</div>
				</div>

				<div v-if="viewModel.state.isSending" class="ai-bubble">
					<div class="ai-bubble__avatar" aria-hidden="true">
						<span class="ai-bubble__avatar-icon"></span>
					</div>
					<div class="ai-bubble__body">
						<span class="ai-bubble__meta">Асистент думає...</span>
						<div class="ai-bubble__thinking">
							<span></span><span></span><span></span>
						</div>
					</div>
				</div>
			</template>
		</div>

		<div class="ai-page__bottom">
			<p v-if="viewModel.state.pageError" class="ai-page__error">
				{{ viewModel.state.pageError }}
			</p>

			<div v-if="selectedRecordingRow" class="ai-page__bound-recording" :aria-label="viewModel.title(selectedRecordingRow)">
				<strong>Поточний запис</strong>
			</div>

			<form class="ai-page__composer" @submit.prevent="viewModel.sendMessage()">
				<div class="ai-page__composer-input">
					<label class="ai-page__label" for="activity-ai-prompt">Запит до ШІ</label>
					<textarea
						id="activity-ai-prompt"
						v-model.trim="viewModel.state.message"
						class="ai-page__textarea"
						placeholder="Запитайте про цей запис..."
						rows="3"
						:disabled="viewModel.state.isSending"
						@keydown.enter.exact.prevent="viewModel.sendMessage()"
					></textarea>
				</div>

				<div class="ai-page__composer-footer">
					<div ref="recordingPickerRef" class="ai-page__recording-picker">
						<button
							class="ai-page__recording-picker-button"
							type="button"
							:aria-expanded="isRecordingMenuOpen"
							:disabled="viewModel.state.isSending || viewModel.state.isLoading"
							aria-label="Обрати запис"
							@click="toggleRecordingMenu"
						></button>

						<div v-if="isRecordingMenuOpen" class="ai-page__recording-picker-menu" role="listbox">
							<button
								v-for="row in viewModel.state.recordingRows"
								:key="row.recording.id"
								class="ai-page__recording-picker-option"
								:class="{ 'ai-page__recording-picker-option_selected': row.recording.id === viewModel.state.selectedRecordingId }"
								type="button"
								role="option"
								:aria-selected="row.recording.id === viewModel.state.selectedRecordingId"
								@click="selectRecording(row.recording.id)"
							>
								<span class="ai-page__recording-picker-option-top">
									<strong :aria-label="viewModel.title(row)">{{ viewModel.title(row) }}</strong>
								</span>
								<span class="ai-page__recording-picker-facts">
									<span class="ai-page__recording-picker-fact ai-page__recording-picker-fact_date">
										<span class="ai-page__recording-picker-fact-icon" aria-hidden="true"></span>
										{{ viewModel.formatDate(row.recording.time.started_at) }}
									</span>
									<span class="ai-page__recording-picker-fact ai-page__recording-picker-fact_duration">
										<span class="ai-page__recording-picker-fact-icon" aria-hidden="true"></span>
										{{ viewModel.formatDuration(row.recording) }}
									</span>
									<span class="ai-page__recording-picker-fact ai-page__recording-picker-fact_samples">
										<span class="ai-page__recording-picker-fact-icon" aria-hidden="true"></span>
										{{ viewModel.formatSamples(row.recording) }}
									</span>
								</span>
								<span class="ai-page__recording-picker-metrics">
									<span class="ai-page__recording-picker-metric ai-page__recording-picker-metric_bpm">
										<span class="ai-page__recording-picker-metric-icon" aria-hidden="true"></span>
										BPM
										<strong>{{ viewModel.metricValue(row, 'bpm') }}</strong>
									</span>
									<span class="ai-page__recording-picker-metric ai-page__recording-picker-metric_spo2">
										<span class="ai-page__recording-picker-metric-icon" aria-hidden="true"></span>
										SpO2
										<strong>{{ viewModel.metricValue(row, 'spo2') }}</strong>
									</span>
									<span
										class="ai-page__recording-picker-metric ai-page__recording-picker-metric_quality"
										:class="`ai-page__recording-picker-metric_quality-${viewModel.qualityTone(row)}`"
									>
										<span class="ai-page__recording-picker-metric-icon" aria-hidden="true"></span>
										Якість
										<strong>{{ viewModel.metricValue(row, 'quality') }}</strong>
									</span>
								</span>
							</button>
							<span v-if="!viewModel.state.recordingRows.length" class="ai-page__recording-picker-empty">
								Немає завершених записів
							</span>
						</div>
					</div>

					<button
						class="ai-page__send"
						type="submit"
						:disabled="viewModel.state.isSending || !viewModel.state.selectedRecordingId || !viewModel.state.message.trim()"
					>
						<span v-if="viewModel.state.isSending" class="ai-page__send-spinner" aria-hidden="true"></span>
						<span>{{ viewModel.state.isSending ? 'Надсилаю...' : 'Надіслати' }}</span>
						<span v-if="!viewModel.state.isSending" class="ai-page__send-icon" aria-hidden="true"></span>
					</button>
				</div>
			</form>

			<div class="ai-page__meta-row">
				<p class="ai-page__disclaimer">{{ messagesLeftLabel }}</p>
				<span
					v-if="viewModel.state.assistantStatus"
					class="ai-page__assistant-status"
					:class="{ 'ai-page__assistant-status_active': viewModel.state.assistantStatus.enabled }"
				>
					<span class="ai-page__assistant-status-dot" aria-hidden="true"></span>
					<span>{{ viewModel.state.assistantStatus.model || 'LLM' }}</span>
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { AIPageViewModel } from '~/controllers/pages/AIPageViewModel';

const props = defineProps<{
	studyId?: string | null
	activeRecordingId?: string | null
}>();

const viewModel = new AIPageViewModel();
const feedRef = ref<HTMLElement | null>(null);
const recordingPickerRef = ref<HTMLElement | null>(null);
const isRecordingMenuOpen = ref(false);
const selectedRecordingRow = computed(() => (
	viewModel.state.recordingRows.find((row) => row.recording.id === viewModel.state.selectedRecordingId) ?? null
));
const messagesLeftLabel = computed(() => (
	`Залишилось ${viewModel.remainingContextMessages()} з ${viewModel.contextMessageLimit} повідомлень контексту`
));

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function toggleRecordingMenu() {
	isRecordingMenuOpen.value = !isRecordingMenuOpen.value;
}

function selectRecording(recordingId: string) {
	viewModel.state.selectedRecordingId = recordingId;
	isRecordingMenuOpen.value = false;
}

function startNewChat() {
	viewModel.startNewChat();
}

function toggleChatHistory() {
	viewModel.toggleHistory();
}

function closeRecordingMenuOnPointerDown(event: PointerEvent) {
	if (!recordingPickerRef.value?.contains(event.target as Node)) {
		isRecordingMenuOpen.value = false;
	}
}

function closeRecordingMenuOnEscape(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		isRecordingMenuOpen.value = false;
	}
}

function scrollFeedToBottom() {
	nextTick(() => {
		if (feedRef.value) {
			feedRef.value.scrollTop = feedRef.value.scrollHeight;
		}
	});
}

watch(() => viewModel.state.messages.length, scrollFeedToBottom);
watch(() => viewModel.state.isSending, scrollFeedToBottom);
watch(
	() => props.studyId,
	(studyId) => {
		viewModel.initialize(studyId ?? null, props.activeRecordingId ?? null);
	},
	{ immediate: true },
);

watch(
	() => props.activeRecordingId,
	(activeRecordingId) => {
		if (activeRecordingId) {
			viewModel.state.selectedRecordingId = activeRecordingId;
			return;
		}

		if (!viewModel.state.activeChatId) {
			viewModel.state.selectedRecordingId = '';
		}
	},
);

onMounted(() => {
	document.addEventListener('pointerdown', closeRecordingMenuOnPointerDown);
	document.addEventListener('keydown', closeRecordingMenuOnEscape);
});

onBeforeUnmount(() => {
	document.removeEventListener('pointerdown', closeRecordingMenuOnPointerDown);
	document.removeEventListener('keydown', closeRecordingMenuOnEscape);
});

defineExpose({
	startNewChat,
	toggleChatHistory,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/ai";
@use "~/assets/styles/scss/core/variables" as *;

@mixin icon-mask($svg) {
	-webkit-mask: url($svg) center / contain no-repeat;
	mask: url($svg) center / contain no-repeat;
}

$icon-plus: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 5v14m7-7H5'/%3E%3C/svg%3E";
$icon-calendar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M8 2v4m8-4v4M3 10h18'/%3E%3Crect width='18' height='18' x='3' y='4' rx='2'/%3E%3C/g%3E%3C/svg%3E";
$icon-clock: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/g%3E%3C/svg%3E";
$icon-samples: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 12h3l2-5l4 10l3-7l2 2h4'/%3E%3C/svg%3E";
$icon-heart-pulse: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 9.5a5.5 5.5 0 0 1 9.59-3.676.56.56 0 0 0 .82 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5'/%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3.22 12H9.5l.5-1l2 4.5l2-7l1.5 3.5h5.27'/%3E%3C/svg%3E";
$icon-droplets: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M7 16.3c2.2 0 4-1.83 4-4.05c0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05'/%3E%3Cpath d='M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97'/%3E%3C/g%3E%3C/svg%3E";
$icon-signal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 20h.01M7 20v-4m5 4v-8m5 8V8m5 12V4'/%3E%3C/svg%3E";

.ai-page_panel {
	height: 100%;
	max-height: none;
}

.ai-page_panel .ai-page__feed {
	align-items: stretch;
	padding: 1em 0.75em 0.75em;
}

.ai-page_panel .ai-page__welcome {
	justify-content: center;
	width: 100%;
	padding: 1em 0.5em;
}

.ai-page_panel .ai-page__bottom {
	padding: 0 0.75em 0.75em;
}

.ai-page_panel .ai-page__composer,
.ai-page_panel .ai-page__error,
.ai-page_panel .ai-bubble,
.ai-page_panel .ai-page__thread-header {
	width: 100%;
}

.ai-page_panel .ai-page__composer,
.ai-page_panel .ai-page__composer:focus-within {
	border-color: transparent;
}

:global(.app-layout__activity-panel:has(.ai-page_panel)),
:global(.app-layout__activity-body:has(.ai-page_panel)) {
	overflow: visible;
}

.ai-page__history {
	flex: 0 0 auto;
	width: calc(100% - 1.5em);
	max-height: 15em;
	margin: 0.15em 0.75em 0;
	padding: 0.7em;
	border: 1px solid rgba(255, 255, 255, 0.09);
	border-radius: $radius-control;
	background: #1f1f1f;
	box-shadow: 0 0.9em 1.8em rgba(0, 0, 0, 0.24);
	overflow-y: auto;
	scrollbar-color: rgba($color-selected, 0.5) transparent;
	scrollbar-gutter: stable;
}

.ai-page__history-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75em;
	margin-bottom: 0.55em;
	color: $color-text-secondary;
	font-size: 8.5pt;
	font-weight: 700;
	line-height: 1;
	text-transform: uppercase;
}

.ai-page__history-list {
	display: flex;
	flex-direction: column;
	gap: 0.4em;
}

.ai-page__history-item {
	display: grid;
	gap: 0.25em;
	width: 100%;
	min-width: 0;
	padding: 0.65em 0.75em;
	border: 1px solid rgba(255, 255, 255, 0.07);
	border-radius: calc($radius-control - 2px);
	background: rgba(255, 255, 255, 0.035);
	color: $color-text-secondary;
	text-align: left;
	cursor: pointer;
	transition:
		border-color 160ms ease,
		background-color 160ms ease,
		color 160ms ease;
}

.ai-page__history-item strong,
.ai-page__history-item span,
.ai-page__history-item small {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ai-page__history-item strong {
	color: $color-text-primary;
	font-size: 10pt;
	font-weight: 700;
	line-height: 1.2;
}

.ai-page__history-item span,
.ai-page__history-item small {
	font-family: $font-data;
	font-size: 8.5pt;
	line-height: 1.2;
}

.ai-page__history-item:hover,
.ai-page__history-item:focus-visible,
.ai-page__history-item_active {
	border-color: rgba($color-selected, 0.28);
	background: rgba($color-selected, 0.11);
	color: $color-text-primary;
	outline: none;
}

.ai-page__history-empty {
	margin: 0;
	color: $color-text-secondary;
	font-size: 9.5pt;
	line-height: 1.35;
}

.ai-page__bound-recording {
	display: flex;
	align-items: center;
	gap: 0.45em;
	width: fit-content;
	max-width: 100%;
	min-width: 0;
	padding: 0.55em 0.8em;
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 1.2em;
	background: rgba(255, 255, 255, 0.045);
	color: $color-text-secondary;
	font-family: $font-data;
	font-size: 8.5pt;
	line-height: 1.2;
	white-space: nowrap;
}

.ai-page__bound-recording strong {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	color: $color-text-primary;
	font-size: 9pt;
	font-weight: 700;
	text-overflow: ellipsis;
}

.ai-page__meta-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.65em;
	width: min(100%, 50em);
	min-width: 0;
}

.ai-page__meta-row .ai-page__disclaimer {
	width: auto;
	min-width: 0;
}

.ai-page__assistant-status {
	display: inline-flex;
	flex: 0 1 auto;
	align-items: center;
	gap: 0.4em;
	min-width: 0;
	max-width: 15em;
	color: $color-text-secondary;
	font-family: $font-data;
	font-size: 8.5pt;
	line-height: 1.15;
}

.ai-page__assistant-status > span:last-child {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ai-page__assistant-status-dot {
	flex: 0 0 auto;
	width: 0.5em;
	height: 0.5em;
	border-radius: 50%;
	background: $color-text-secondary;
	opacity: 0.5;
}

.ai-page__assistant-status_active .ai-page__assistant-status-dot {
	background: #4ade80;
	opacity: 1;
	box-shadow: 0 0 0 0.18em rgba(#4ade80, 0.22);
}

.ai-page__recording-picker {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.ai-page__recording-picker-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2.25em;
	height: 2.25em;
	padding: 0;
	border: $border-default;
	border-color: rgba(255, 255, 255, 0.08);
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.04);
	color: $color-text-secondary;
	cursor: pointer;
	transition:
		border-color 160ms ease,
		background-color 160ms ease,
		color 160ms ease;
}

.ai-page__recording-picker-button::before {
	content: "";
	display: block;
	width: 1.05em;
	height: 1.05em;
	background: currentColor;
	@include icon-mask($icon-plus);
}

.ai-page__recording-picker-button:hover:not(:disabled),
.ai-page__recording-picker-button:focus-visible:not(:disabled),
.ai-page__recording-picker-button[aria-expanded="true"] {
	border-color: rgba($color-selected, 0.35);
	background: rgba(255, 255, 255, 0.07);
	color: $color-selected;
	outline: none;
}

.ai-page__recording-picker-button:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.ai-page__recording-picker-menu {
	position: absolute;
	z-index: 20;
	bottom: calc(100% + 6.25em);
	left: 0;
	display: flex;
	flex-direction: column;
	gap: 0.35em;
	width: max-content;
	min-width: min(31em, calc(100vw - 6em));
	max-width: calc(100vw - 7em);
	max-height: min(16em, 38vh);
	padding: 0.5em;
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: $radius-control;
	background: #242424;
	box-shadow: 0 1.2em 2.4em rgba(0, 0, 0, 0.42);
	overflow-x: visible;
	overflow-y: auto;
	scrollbar-color: rgba($color-selected, 0.68) rgba(255, 255, 255, 0.06);
	scrollbar-gutter: stable;
}

.ai-page__recording-picker-option {
	display: flex;
	flex: 0 0 auto;
	flex-direction: column;
	align-items: center;
	gap: 0.45em;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	min-height: 0;
	padding: 0.6em 0.75em;
	box-sizing: border-box;
	border: 1px solid transparent;
	border-radius: calc($radius-control - 2px);
	background: rgba(255, 255, 255, 0.035);
	color: $color-text-secondary;
	font-family: $font-data;
	font-size: 9pt;
	line-height: 1.25;
	text-align: left;
	cursor: pointer;
}

.ai-page__recording-picker-option-top,
.ai-page__recording-picker-facts,
.ai-page__recording-picker-metrics {
	width: 100%;
	min-width: 0;
}

.ai-page__recording-picker-option-top {
	display: flex;
	align-items: center;
}

.ai-page__recording-picker-option-top strong {
	position: relative;
	display: block;
	min-width: 0;
	max-width: 100%;
	color: $color-text-primary;
	font-family: $font-data;
	font-size: 10pt;
	font-weight: 700;
	line-height: 1.2;
	white-space: nowrap;
}

.ai-page__recording-picker-option-top strong::after {
	content: none;
}

.ai-page__recording-picker-option:hover .ai-page__recording-picker-option-top strong::after,
.ai-page__recording-picker-option:focus-visible .ai-page__recording-picker-option-top strong::after,
.ai-page__recording-picker-option_selected .ai-page__recording-picker-option-top strong::after {
	background: linear-gradient(90deg, rgba($color-selected, 0), #293648 78%);
}

.ai-page__recording-picker-facts,
.ai-page__recording-picker-metrics {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-start;
	gap: 0.4em 0.7em;
}

.ai-page__recording-picker-fact,
.ai-page__recording-picker-metric {
	display: inline-flex;
	align-items: center;
	min-width: 0;
}

.ai-page__recording-picker-fact {
	gap: 0.28em;
	color: $color-text-secondary;
	font-size: 9pt;
	line-height: 1.25;
}

.ai-page__recording-picker-fact-icon {
	display: block;
	flex: 0 0 auto;
	width: 0.9em;
	height: 0.9em;
	background: currentColor;
	opacity: 0.75;
}

.ai-page__recording-picker-fact_date .ai-page__recording-picker-fact-icon {
	@include icon-mask($icon-calendar);
}

.ai-page__recording-picker-fact_duration .ai-page__recording-picker-fact-icon {
	@include icon-mask($icon-clock);
}

.ai-page__recording-picker-fact_samples .ai-page__recording-picker-fact-icon {
	@include icon-mask($icon-samples);
}

.ai-page__recording-picker-metric {
	--metric-accent: #ffffff;
	gap: 0.28em;
	width: fit-content;
	min-height: 2em;
	padding: 0 0.45em;
	border: 1px solid rgba(255, 255, 255, 0.09);
	border-radius: calc($radius-control - 3px);
	background: rgba(255, 255, 255, 0.035);
	color: $color-text-secondary;
	font-family: $font-data;
	font-size: 8.5pt;
	line-height: 1;
}

.ai-page__recording-picker-metric_quality-high {
	--metric-accent: #78e2c0;
}

.ai-page__recording-picker-metric_quality-medium {
	--metric-accent: #f6c667;
}

.ai-page__recording-picker-metric_quality-low {
	--metric-accent: #ff7878;
}

.ai-page__recording-picker-metric_quality-neutral {
	--metric-accent: #ffffff;
}

.ai-page__recording-picker-metric-icon {
	display: block;
	flex: 0 0 auto;
	width: 0.95em;
	height: 0.95em;
	background: var(--metric-accent);
}

.ai-page__recording-picker-metric_bpm .ai-page__recording-picker-metric-icon {
	@include icon-mask($icon-heart-pulse);
}

.ai-page__recording-picker-metric_spo2 .ai-page__recording-picker-metric-icon {
	@include icon-mask($icon-droplets);
}

.ai-page__recording-picker-metric_quality .ai-page__recording-picker-metric-icon {
	@include icon-mask($icon-signal);
}

.ai-page__recording-picker-metric strong {
	margin-left: 0.4em;
	color: var(--metric-accent);
	font-family: $font-data;
	font-size: 9pt;
	font-weight: 400;
	line-height: 1;
}

.ai-page__recording-picker-option:hover,
.ai-page__recording-picker-option:focus-visible,
.ai-page__recording-picker-option_selected {
	border-color: rgba($color-selected, 0.24);
	background: rgba($color-selected, 0.12);
	color: $color-text-primary;
	outline: none;
}

.ai-page__recording-picker-empty {
	padding: 0.6em 0.75em;
	color: $color-text-secondary;
	font-size: 9.5pt;
	line-height: 1.3;
}

@media (max-width: 34em) {
	.ai-page__history {
		width: calc(100% - 1.25em);
		margin-right: 0.625em;
		margin-left: 0.625em;
	}

	.ai-page__bound-recording {
		flex-wrap: wrap;
		white-space: normal;
	}

	.ai-page__bound-recording strong {
		flex: 1 1 100%;
	}

	.ai-page__meta-row {
		flex-wrap: wrap;
		gap: 0.4em 0.65em;
	}

	.ai-page__recording-picker-menu {
		bottom: calc(100% + 5.75em);
		min-width: calc(100vw - 3em);
		max-width: calc(100vw - 3em);
	}

	.ai-page__recording-picker-option {
		width: 100%;
		max-width: 100%;
	}

	.ai-page__recording-picker-option-top strong {
		overflow: hidden;
		text-overflow: ellipsis;
	}
}
</style>
