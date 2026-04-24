<template>
	<section class="AIPage">
		<header class="AIPage__header">
			<span class="AIPage__mark" aria-hidden="true"></span>
			<h1>Вітаю, питайте що завгодно</h1>
		</header>

		<form class="AIPage__composer" @submit.prevent>
			<label class="AIPage__label" for="ai-prompt">Запит до ШІ</label>
			<textarea
				id="ai-prompt"
				class="AIPage__textarea"
				placeholder="Написати..."
				rows="4"
			></textarea>

			<div class="AIPage__toolbar">
				<button class="AIPage__iconButton AIPage__iconButton--attach" type="button" aria-label="Додати файл"></button>

				<div class="AIPage__actions">
					<div class="AIPage__model">
						<button
							class="AIPage__modelButton"
							type="button"
							:aria-expanded="viewModel.state.isModelMenuOpen"
							@click="viewModel.toggleModelMenu()"
						>
							<span>{{ viewModel.state.selectedModel.name }}</span>
							<span class="AIPage__modelChevron" aria-hidden="true"></span>
						</button>

						<div v-if="viewModel.state.isModelMenuOpen" class="AIPage__modelMenu">
							<button
								v-for="model in viewModel.state.models"
								:key="model.name"
								class="AIPage__modelOption"
								type="button"
								:class="{ 'AIPage__modelOption--selected': model.name === viewModel.state.selectedModel.name }"
								@click="viewModel.selectModel(model)"
							>
								<span>
									<strong>{{ model.name }}</strong>
									<small>{{ model.description }}</small>
								</span>
								<span v-if="model.name === viewModel.state.selectedModel.name" class="AIPage__modelCheck" aria-hidden="true"></span>
							</button>

							<div class="AIPage__thinking">
								<span>
									<strong>Режим міркування</strong>
									<small>Міркує задля рішення важких задач</small>
								</span>

								<label class="AIPage__switch">
									<input v-model="viewModel.state.adaptiveThinking" type="checkbox" />
									<span></span>
								</label>
							</div>
						</div>
					</div>

					<button class="AIPage__iconButton AIPage__iconButton--mic" type="button" aria-label="Голосовий ввід"></button>
					<button class="AIPage__send" type="submit">Send</button>
				</div>
			</div>
		</form>
	</section>
</template>

<script setup lang="ts">
import { AIPageViewModel } from '~/controllers/pages/AIPageViewModel';

const viewModel = new AIPageViewModel();
</script>

<style scoped lang="scss">
@use "~/styles/scss/pages/ai";
</style>
