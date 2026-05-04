<template>
	<!-- СТРОГО НЕ УДАЛЯТЬ, ОСТАВИТЬ НА БУДУЩЕЕ: функціонал ШІ-чату тимчасово вимкнено. -->
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
	<section class="ai-page">
		<header class="ai-page__header">
			<span class="ai-page__mark" aria-hidden="true"></span>
			<h1>Асистент запису</h1>
		</header>

		<p v-if="viewModel.state.pageError" class="ai-page__error">
			{{ viewModel.state.pageError }}
		</p>

		<div class="ai-page__status">
			<span>{{ viewModel.state.assistantStatus?.enabled ? 'Активний' : 'Неактивний' }}</span>
			<strong>{{ viewModel.state.assistantStatus?.model ?? 'LLM не налаштовано' }}</strong>
		</div>

		<div class="ai-page__messages">
			<p v-if="!viewModel.state.messages.length" class="ai-page__empty">
				Оберіть завершений запис і поставте питання
			</p>

			<div
				v-for="message in viewModel.state.messages"
				:key="`${message.timestamp}-${message.provider.type}`"
				class="ai-message"
				:class="{ 'ai-message_user': message.provider.type === 'user' }"
			>
				<span class="ai-message__meta">{{ message.provider.type }} · {{ message.provider.model }}</span>
				<p>{{ message.message }}</p>
			</div>
		</div>

		<form class="ai-page__composer" @submit.prevent="viewModel.sendMessage()">
			<SelectBox
				v-model="viewModel.state.selectedRecordingId"
				label="Запис"
				:items="viewModel.state.recordings"
				label-key="id"
				value-key="id"
				:disabled="viewModel.state.isSending"
			/>

			<label class="ai-page__label" for="ai-prompt">Запит до ШІ</label>
			<textarea
				id="ai-prompt"
				v-model.trim="viewModel.state.message"
				class="ai-page__textarea"
				placeholder="Питання щодо якості PPG-запису..."
				rows="4"
			></textarea>

			<div class="ai-page__toolbar">
				<span class="ai-page__hint">{{ viewModel.state.recordings.length }} завершених записів</span>
				<button
					class="ai-page__send"
					type="submit"
					:disabled="viewModel.state.isSending || !viewModel.state.selectedRecordingId || !viewModel.state.message.trim()"
				>
					Надіслати
				</button>
			</div>
		</form>
	</section>
</template>

<script setup lang="ts">
// СТРОГО НЕ УДАЛЯТЬ, ОСТАВИТЬ НА БУДУЩЕЕ: залишено для майбутнього повернення ШІ-чату.
import SelectBox from '~/components/SelectBox.vue';
import { AIPageViewModel } from '~/controllers/pages/AIPageViewModel';
import { ProjectDashboardPageViewModel } from '~/controllers/pages/ProjectDashboardPageViewModel';

const route = useRoute();
const projectName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const projectViewModel = new ProjectDashboardPageViewModel(projectName ?? '');
const viewModel = new AIPageViewModel();

projectViewModel.initialize().then(() => {
	return viewModel.initialize(projectViewModel.state.project?.id ?? null);
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/ai";
</style>
