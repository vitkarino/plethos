<template>
	<div class="ai-page ai-page_panel">
		<div class="ai-page__feed" ref="feedRef">
			<div v-if="!viewModel.state.messages.length" class="ai-page__welcome">
				<div class="ai-page__welcome-icon" aria-hidden="true"></div>
				<h2 class="ai-page__welcome-title">Асистент запису</h2>
				<p class="ai-page__welcome-sub">
					Оберіть завершений запис і поставте питання про якість PPG-сигналу
				</p>

				<div class="ai-page__status-badge" :class="{ 'ai-page__status-badge_active': viewModel.state.assistantStatus?.enabled }">
					<span class="ai-page__status-dot" aria-hidden="true"></span>
					<span>{{ viewModel.state.assistantStatus?.enabled ? 'Асистент активний' : 'Асистент неактивний' }}</span>
					<strong v-if="viewModel.state.assistantStatus?.model">{{ viewModel.state.assistantStatus.model }}</strong>
				</div>
			</div>

			<template v-else>
				<div class="ai-page__thread-header">
					<div class="ai-page__status-badge" :class="{ 'ai-page__status-badge_active': viewModel.state.assistantStatus?.enabled }">
						<span class="ai-page__status-dot" aria-hidden="true"></span>
						<span>{{ viewModel.state.assistantStatus?.model ?? 'LLM' }}</span>
					</div>
				</div>

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
					<SelectBox
						v-model="viewModel.state.selectedRecordingId"
						class="ai-page__recording-select"
						:items="recordingOptions"
						placeholder="Запис"
						label-key="label"
						value-key="value"
						:disabled="viewModel.state.isSending || viewModel.state.isLoading"
					/>

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

			<div class="ai-page__panel-actions">
				<button
					class="ai-page__new-chat"
					type="button"
					:disabled="viewModel.state.isSending"
					@click="viewModel.startNewChat()"
				>
					Новий чат
				</button>
				<p class="ai-page__disclaimer">AI може допускати помилки.</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import SelectBox from '~/components/SelectBox.vue';
import { AIPageViewModel } from '~/controllers/pages/AIPageViewModel';

const props = defineProps<{
	projectId?: string | null
}>();

const viewModel = new AIPageViewModel();
const feedRef = ref<HTMLElement | null>(null);
const recordingOptions = computed(() => viewModel.state.recordings.map((recording) => ({
	label: formatRecordingLabel(recording.id),
	value: recording.id,
})));

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function formatRecordingLabel(recordingId: string): string {
	return recordingId.length > 18 ? `Запис ${recordingId.slice(-8)}` : `Запис ${recordingId}`;
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
	() => props.projectId,
	(projectId) => {
		viewModel.initialize(projectId ?? null);
	},
	{ immediate: true },
);
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/ai";
@use "~/assets/styles/scss/core/variables" as *;

.ai-page_panel {
	height: 100%;
	max-height: none;
}

.ai-page_panel .ai-page__feed {
	align-items: stretch;
	padding: 1em 0.75em 0.75em;
}

.ai-page_panel .ai-page__welcome {
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

.ai-page__panel-actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75em;
	width: min(100%, 50em);
}

.ai-page__new-chat {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 2.25em;
	padding: 0 0.9em;
	border: $border-default;
	border-radius: $radius-control;
	background: $color-button-bg;
	color: $color-text-primary;
	font-family: $font-text;
	font-size: 10pt;
	font-weight: 700;
	line-height: 1;
	cursor: pointer;
}

.ai-page__new-chat:hover,
.ai-page__new-chat:focus-visible {
	border-color: $color-selected;
	background: $color-button-bg-hover;
	color: $color-selected;
	outline: none;
}

.ai-page__new-chat:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}
</style>
