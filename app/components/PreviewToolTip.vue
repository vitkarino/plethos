<template>
	<div class="preview-tool-tip">
		<div class="preview-tool-tip__header">
			<strong>{{ title }}</strong>
			<span>{{ count }}</span>
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
	error?: string;
	emptyLabel?: string;
}>(), {
	error: '',
	emptyLabel: 'No items',
});
</script>

<style lang="scss">
@use "~/assets/styles/scss/components/PreviewToolTip";
</style>
