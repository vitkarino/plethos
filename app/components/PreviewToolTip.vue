<template>
	<div class="preview-tool-tip">
		<div class="preview-tool-tip__header">
			<strong>{{ title }}</strong>
			<span
				class="preview-tool-tip__count"
				:class="countIcon ? `preview-tool-tip__count_${countIcon}` : undefined"
			>
				{{ count }}
			</span>
		</div>

		<p v-if="error" class="preview-tool-tip__error">
			{{ error }}
		</p>

		<div v-if="hasItems" class="preview-tool-tip__list">
			<slot />
		</div>

		<p v-else class="preview-tool-tip__empty">{{ emptyLabel }}</p>
	</div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	title: string;
	count: number;
	hasItems: boolean;
	countIcon?: 'projects' | 'users';
	error?: string;
	emptyLabel?: string;
}>(), {
	countIcon: undefined,
	error: '',
	emptyLabel: 'Немає елементів',
});
</script>

<style lang="scss">
@use "~/assets/styles/scss/components/PreviewToolTip";
</style>
