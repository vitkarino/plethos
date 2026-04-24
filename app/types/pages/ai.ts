export type ModelOption = {
	name: string
	description: string
}

export type AIPageState = {
	models: ModelOption[]
	selectedModel: ModelOption
	isModelMenuOpen: boolean
	adaptiveThinking: boolean
}
