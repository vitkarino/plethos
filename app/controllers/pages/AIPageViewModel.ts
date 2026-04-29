import { reactive } from 'vue'
import type { AIPageState, ModelOption } from '~/types/pages/ai'

const models: ModelOption[] = [
	{
		name: 'GPT-5.5',
		description: 'Найпотужніша модель для складної роботи',
	},
	{
		name: 'Claude Opus 4.7',
		description: 'Найефективніша для щоденних задач',
	},
	{
		name: 'Gemini 3 Flash',
		description: 'Найшвидша для коротких відповідей',
	},
]

export class AIPageViewModel {
	public readonly state = reactive<AIPageState>({
		models,
		selectedModel: models[1],
		isModelMenuOpen: false,
		adaptiveThinking: false,
	})

	public selectModel(model: ModelOption) {
		this.state.selectedModel = model
		this.state.isModelMenuOpen = false
	}

	public toggleModelMenu() {
		this.state.isModelMenuOpen = !this.state.isModelMenuOpen
	}
}
