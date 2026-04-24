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
							:aria-expanded="isModelMenuOpen"
							@click="isModelMenuOpen = !isModelMenuOpen"
						>
							<span>{{ selectedModel.name }}</span>
							<span class="AIPage__modelChevron" aria-hidden="true"></span>
						</button>

						<div v-if="isModelMenuOpen" class="AIPage__modelMenu">
							<button
								v-for="model in models"
								:key="model.name"
								class="AIPage__modelOption"
								type="button"
								:class="{ 'AIPage__modelOption--selected': model.name === selectedModel.name }"
								@click="selectModel(model)"
							>
								<span>
									<strong>{{ model.name }}</strong>
									<small>{{ model.description }}</small>
								</span>
								<span v-if="model.name === selectedModel.name" class="AIPage__modelCheck" aria-hidden="true"></span>
							</button>

							<div class="AIPage__thinking">
								<span>
									<strong>Режим міркування</strong>
									<small>Міркує задля рішення важких задач</small>
								</span>

								<label class="AIPage__switch">
									<input v-model="adaptiveThinking" type="checkbox" />
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
type ModelOption = {
	name: string;
	description: string;
};

const models: ModelOption[] = [
	{
		name: 'GPT-5.5',
		description: 'Most capable for ambitious work',
	},
	{
		name: 'Claude Opus 4.7',
		description: 'Most efficient for everyday tasks',
	},
	{
		name: 'Gemini 3 Flash',
		description: 'Fastest for short answers',
	},
];

const selectedModel = ref<ModelOption>(models[1]);
const isModelMenuOpen = ref(false);
const adaptiveThinking = ref(false);

function selectModel(model: ModelOption) {
	selectedModel.value = model;
	isModelMenuOpen.value = false;
}
</script>

<style scoped lang="scss">
@use "~/styles/scss/pages/ai";
</style>
