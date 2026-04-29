<template>
	<details
		ref="rootElement"
		v-bind="$attrs"
		class="tool-tip"
		:class="`tool-tip_${placement}`"
		@toggle="closeOtherToolTips"
	>
		<summary class="tool-tip__trigger" :class="triggerClass" :aria-label="ariaLabel">
			<slot name="trigger">
				<span class="tool-tip__icon-button" aria-hidden="true"></span>
			</slot>
		</summary>

		<div class="tool-tip__menu" :style="{ minWidth }">
			<slot />
		</div>
	</details>
</template>

<script setup lang="ts">
type ClassValue = string | Record<string, boolean> | Array<string | Record<string, boolean>>;

withDefaults(defineProps<{
	ariaLabel?: string;
	triggerClass?: ClassValue;
	placement?: 'left' | 'right';
	minWidth?: string;
}>(), {
	ariaLabel: undefined,
	triggerClass: undefined,
	placement: 'right',
	minWidth: undefined,
});

const rootElement = ref<HTMLDetailsElement | null>(null);

function closeOtherToolTips() {
	const currentElement = rootElement.value;

	if (!currentElement?.open) {
		return;
	}

	document.querySelectorAll<HTMLDetailsElement>('details.tool-tip[open]').forEach((element) => {
		if (element !== currentElement) {
			element.open = false;
		}
	});
}
</script>

<style lang="scss">
@use "~/assets/styles/scss/components/ToolTip";
</style>
