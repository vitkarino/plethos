import type { MaybeRef } from 'vue';
import { inject, onUnmounted, provide, reactive, unref, watchEffect } from 'vue';

export type PageHeaderAction = {
	label: string
	to?: string
	variant?: 'default' | 'primary' | 'ghost'
	icon?: 'study-add' | 'participant-add' | 'chat-add'
	disabled?: MaybeRef<boolean>
	onClick?: () => void
}

type PageHeaderConfig = {
	title: MaybeRef<string>
	subtitle?: MaybeRef<string>
	backLabel?: MaybeRef<string>
	backTo?: MaybeRef<string>
	modeLabel?: MaybeRef<string>
	infoTooltip?: MaybeRef<string>
	actions?: MaybeRef<PageHeaderAction[]>
}

export type PageHeaderState = {
	title: string
	subtitle: string
	backLabel: string
	backTo: string
	modeLabel: string
	infoTooltip: string
	actions: PageHeaderAction[]
	owner: symbol | null
}

const pageHeaderKey = Symbol('page-header');

export function providePageHeader() {
	const state = reactive<PageHeaderState>({
		title: '',
		subtitle: '',
		backLabel: '',
		backTo: '',
		modeLabel: '',
		infoTooltip: '',
		actions: [],
		owner: null,
	});

	provide(pageHeaderKey, state);

	return state;
}

export function usePageHeader(config: PageHeaderConfig) {
	const state = inject<PageHeaderState | null>(pageHeaderKey, null);

	if (!state) {
		return;
	}

	const owner = Symbol('page-header-owner');

	const stop = watchEffect(() => {
		state.owner = owner;
		state.title = unref(config.title);
		state.subtitle = config.subtitle ? unref(config.subtitle) : '';
		state.backLabel = config.backLabel ? unref(config.backLabel) : '';
		state.backTo = config.backTo ? unref(config.backTo) : '';
		state.modeLabel = config.modeLabel ? unref(config.modeLabel) : '';
		state.infoTooltip = config.infoTooltip ? unref(config.infoTooltip) : '';
		state.actions = config.actions ? unref(config.actions) : [];
	});

	onUnmounted(() => {
		stop();
		if (state.owner !== owner) {
			return;
		}

		state.title = '';
		state.subtitle = '';
		state.backLabel = '';
		state.backTo = '';
		state.modeLabel = '';
		state.infoTooltip = '';
		state.actions = [];
		state.owner = null;
	});
}
