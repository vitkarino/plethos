import type { MaybeRef } from 'vue';
import { inject, onUnmounted, provide, reactive, unref, watchEffect } from 'vue';

export type PageHeaderAction = {
	label: string
	to?: string
	variant?: 'default' | 'primary' | 'ghost'
	icon?: 'project-add' | 'user-add'
	disabled?: MaybeRef<boolean>
	onClick?: () => void
}

type PageHeaderConfig = {
	title: MaybeRef<string>
	subtitle?: MaybeRef<string>
	actions?: MaybeRef<PageHeaderAction[]>
}

export type PageHeaderState = {
	title: string
	subtitle: string
	actions: PageHeaderAction[]
}

const pageHeaderKey = Symbol('page-header');

export function providePageHeader() {
	const state = reactive<PageHeaderState>({
		title: '',
		subtitle: '',
		actions: [],
	});

	provide(pageHeaderKey, state);

	return state;
}

export function usePageHeader(config: PageHeaderConfig) {
	const state = inject<PageHeaderState | null>(pageHeaderKey, null);

	if (!state) {
		return;
	}

	const stop = watchEffect(() => {
		state.title = unref(config.title);
		state.subtitle = config.subtitle ? unref(config.subtitle) : '';
		state.actions = config.actions ? unref(config.actions) : [];
	});

	onUnmounted(() => {
		stop();
		state.title = '';
		state.subtitle = '';
		state.actions = [];
	});
}
