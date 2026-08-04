<template>
	<component
		:is="tag"
		class="panel"
		:class="[contentClass, { 'panel_fill': fill }]"
	>
		<slot />
	</component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	tag?: 'section' | 'div'
	contentClass?: string
	fill?: boolean
}>(), {
	tag: 'section',
	contentClass: '',
	fill: false,
});
</script>

<style scoped lang="scss">
@use "~/assets/styles/components/Panel";
</style>
