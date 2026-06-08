<template>
	<Panel tag="div" content-class="ai-page" fill>
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
							{{ message.provider.type === 'user' ? 'Ви' : 'Асистент' }}
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
					<label class="ai-page__label" for="sidebar-ai-prompt">Запит до ШІ</label>
					<textarea
						id="sidebar-ai-prompt"
						v-model.trim="viewModel.state.message"
						class="ai-page__textarea"
						placeholder="Запитайте про цей запис..."
						rows="3"
						:disabled="viewModel.state.isSending"
						@keydown.enter.exact.prevent="viewModel.sendMessage()"
					></textarea>
				</div>

				<div class="ai-page__composer-footer">
					<label class="ai-page__recording-native">
						<span class="ai-page__label">Запис</span>
						<select
							class="ai-page__native-select"
							:value="viewModel.state.selectedRecordingId"
							:disabled="viewModel.state.isSending || viewModel.state.isLoading || !viewModel.state.recordingRows.length"
							@change="handleRecordingNativeSelect"
						>
							<option value="" disabled>
								{{ viewModel.state.recordingRows.length ? 'Оберіть запис' : 'Немає завершених записів' }}
							</option>
							<option v-for="row in viewModel.state.recordingRows" :key="row.recording.id" :value="row.recording.id">
								{{ viewModel.title(row) }} · {{ viewModel.formatDate(row.recording.time.started_at) }}
							</option>
						</select>
					</label>

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
		</div>
	</Panel>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import Panel from '~/components/Panel.vue';
import { AIPageViewModel } from '~/controllers/pages/AIPageViewModel';

const props = defineProps<{
	studyId?: string | null
	activeRecordingId?: string | null
}>();

const viewModel = new AIPageViewModel();
const feedRef = ref<HTMLElement | null>(null);

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function startNewChat() {
	viewModel.startNewChat();
}

function selectChatHistory(chatId: string) {
	if (chatId) {
		viewModel.selectChat(chatId);
	}
}

function handleRecordingNativeSelect(event: Event) {
	const recordingId = (event.target as HTMLSelectElement).value;

	if (recordingId) {
		viewModel.state.selectedRecordingId = recordingId;
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

defineExpose({
	formatChatDate: viewModel.formatChatDate.bind(viewModel),
	selectChatHistory,
	startNewChat,
	state: viewModel.state,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/ai";
@use "~/assets/styles/scss/core/variables" as *;

:global(.panel.ai-page) :deep(.ai-page__feed) {
	align-items: stretch;
	padding: 1em 0.75em 0.75em;
}

:global(.panel.ai-page) :deep(.ai-page__welcome) {
	justify-content: center;
	width: 100%;
	padding: 1em 0.5em;
}

:global(.panel.ai-page) :deep(.ai-page__bottom) {
	padding: 0 0.75em 0.75em;
}

:global(.panel.ai-page) :deep(.ai-page__composer),
:global(.panel.ai-page) :deep(.ai-page__error),
:global(.panel.ai-page) :deep(.ai-bubble),
:global(.panel.ai-page) :deep(.ai-page__thread-header) {
	width: 100%;
}

:global(.panel.ai-page) :deep(.ai-page__composer),
:global(.panel.ai-page) :deep(.ai-page__composer:focus-within) {
	border-color: transparent;
}

:global(.app-layout__activity-panel:has(.panel.ai-page)),
:global(.app-layout__activity-body:has(.panel.ai-page)) {
	overflow: visible;
}

.ai-page__recording-native {
	display: inline-flex;
	flex-direction: column;
	gap: 0.35em;
	min-width: 0;
	flex: 1 1 14em;
	max-width: 22em;
}

.ai-page__native-select {
	min-width: 0;
	min-height: 2.35em;
	padding: 0 0.75em;
	border: 0;
	border-radius: $radius-control;
	background: rgba(255, 255, 255, 0.055);
	color: $color-text-primary;
	font-family: $font-data;
	font-size: 9.5pt;
	line-height: 1.2;
	outline: none;
	color-scheme: dark;
}

.ai-page__native-select:hover:not(:disabled),
.ai-page__native-select:focus-visible {
	background: rgba($color-selected, 0.1);
	color: $color-selected;
}

.ai-page__native-select:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}
</style>
