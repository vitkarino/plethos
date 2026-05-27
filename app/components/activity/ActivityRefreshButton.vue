<template>
	<button
		class="activity-refresh-button"
		type="button"
		:disabled="disabled"
		:aria-label="label"
		@click="$emit('click')"
	></button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	disabled?: boolean
	label?: string
}>(), {
	disabled: false,
	label: 'Оновити',
});

defineEmits<{
	click: []
}>();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/core/variables" as *;

@mixin icon-mask($svg) {
	-webkit-mask: url($svg) center / contain no-repeat;
	mask: url($svg) center / contain no-repeat;
}

$icon-refresh: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='M3 12a9 9 0 0 1 15.5-6.2'/%3E%3Cpath d='M18 2v4h-4'/%3E%3Cpath d='M21 12a9 9 0 0 1-15.5 6.2'/%3E%3Cpath d='M6 22v-4h4'/%3E%3C/g%3E%3C/svg%3E";

.activity-refresh-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2.15em;
	height: 2.15em;
	padding: 0;
	// border: 1px solid rgba(255, 255, 255, 0.12);
	border: none;
	border-radius: 50%;
	background: none;
	// background: rgba(255, 255, 255, 0.04);
	color: $color-text-secondary;
	cursor: pointer;
	transition:
		background-color 160ms ease,
		border-color 160ms ease,
		color 160ms ease,
		transform 160ms ease;
}

.activity-refresh-button::before {
	content: "";
	display: block;
	width: 1.05em;
	height: 1.05em;
	background: currentColor;
	@include icon-mask($icon-refresh);
}

.activity-refresh-button:hover,
.activity-refresh-button:focus-visible {
	border-color: rgba($color-selected, 0.4);
	background: $color-button-bg-hover;
	color: $color-selected;
	outline: none;
	transform: rotate(-18deg);
}

.activity-refresh-button:disabled {
	cursor: not-allowed;
	opacity: 0.55;
	transform: none;
}
</style>
