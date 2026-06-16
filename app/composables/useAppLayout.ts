import { inject, provide } from 'vue'
import type { DefaultLayoutViewModel } from '~/controllers/layouts/DefaultLayoutViewModel'

const appLayoutKey = Symbol('app-layout')

export function provideAppLayout(viewModel: DefaultLayoutViewModel) {
	provide(appLayoutKey, viewModel)

	return viewModel
}

export function useAppLayout() {
	const viewModel = inject<DefaultLayoutViewModel | null>(appLayoutKey, null)

	if (!viewModel) {
		throw new Error('useAppLayout must be used within the default layout')
	}

	return viewModel
}
