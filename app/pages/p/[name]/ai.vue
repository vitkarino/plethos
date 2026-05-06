<template>
	<!-- СТРОГО НЕ УДАЛЯТЬ, ОСТАВИТЬ НА БУДУЩЕЕ: старий прототип ШІ-чату залишено для майбутнього повернення. -->
	<!--
	<section class="ai-page">
		<header class="ai-page__header">
			<span class="ai-page__mark" aria-hidden="true"></span>
			<h1>Вітаю, питайте що завгодно</h1>
		</header>

		<form class="ai-page__composer" @submit.prevent>
			<label class="ai-page__label" for="ai-prompt">Запит до ШІ</label>
			<textarea
				id="ai-prompt"
				class="ai-page__textarea"
				placeholder="Написати..."
				rows="4"
			></textarea>

			<div class="ai-page__toolbar">
				<button class="ai-page__icon-button ai-page__icon-button_attach" type="button" aria-label="Додати файл"></button>

				<div class="ai-page__actions">
					<div class="ai-page__model">
						<button
							class="ai-page__model-button"
							type="button"
							:aria-expanded="viewModel.state.isModelMenuOpen"
							@click="viewModel.toggleModelMenu()"
						>
							<span>{{ viewModel.state.selectedModel.name }}</span>
							<span class="ai-page__model-chevron" aria-hidden="true"></span>
						</button>

						<div v-if="viewModel.state.isModelMenuOpen" class="ai-page__model-menu">
							<button
								v-for="model in viewModel.state.models"
								:key="model.name"
								class="ai-page__model-option"
								type="button"
								:class="{ 'ai-page__model-option_selected': model.name === viewModel.state.selectedModel.name }"
								@click="viewModel.selectModel(model)"
							>
								<span>
									<strong>{{ model.name }}</strong>
									<small>{{ model.description }}</small>
								</span>
								<span v-if="model.name === viewModel.state.selectedModel.name" class="ai-page__model-check" aria-hidden="true"></span>
							</button>

							<div class="ai-page__thinking">
								<span>
									<strong>Режим міркування</strong>
									<small>Міркує задля рішення важких задач</small>
								</span>

								<label class="ai-page__switch">
									<input v-model="viewModel.state.adaptiveThinking" type="checkbox" />
									<span></span>
								</label>
							</div>
						</div>
					</div>

					<button class="ai-page__icon-button ai-page__icon-button_mic" type="button" aria-label="Голосовий ввід"></button>
					<button class="ai-page__send" type="submit">Надіслати</button>
				</div>
			</div>
		</form>
	</section>
	-->
	<div class="ai-page">
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
					<label class="ai-page__label" for="ai-prompt">Запит до ШІ</label>
					<textarea
						id="ai-prompt"
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

			<p class="ai-page__disclaimer">AI може допускати помилки.</p>
		</div>
	</div>
</template>

<script setup lang="ts">
// СТРОГО НЕ УДАЛЯТЬ, ОСТАВИТЬ НА БУДУЩЕЕ: старий прототип залишено вище для майбутнього повернення.
import { computed, nextTick, ref, watch } from 'vue';
import SelectBox from '~/components/SelectBox.vue';
import { AIPageViewModel } from '~/controllers/pages/AIPageViewModel';
import { ProjectDashboardPageViewModel } from '~/controllers/pages/ProjectDashboardPageViewModel';

const route = useRoute();
const projectName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const projectViewModel = new ProjectDashboardPageViewModel(projectName ?? '');
const viewModel = new AIPageViewModel();
const feedRef = ref<HTMLElement | null>(null);
const recordingOptions = computed(() => viewModel.state.recordings.map((recording) => ({
	label: formatRecordingLabel(recording.id),
	value: recording.id,
})));

usePageHeader({
	title: 'Асистент запису',
	actions: [
		{
			label: 'Новий чат',
			variant: 'primary',
			icon: 'chat-add',
			disabled: computed(() => viewModel.state.isSending),
			onClick: () => viewModel.startNewChat(),
		},
	],
});

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

projectViewModel.initialize().then(() => {
	return viewModel.initialize(projectViewModel.state.project?.id ?? null);
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/ai";
</style>
