<template>
	<div class="blocks-grid" :class="{ 'blocks-grid_single': !hasRightSlot }">
		<div class="blocks-grid__top-left">
			<slot name="topLeft" />
		</div>

		<div v-if="hasRightSlot" class="blocks-grid__right">
			<slot name="right" />
		</div>
	</div>
</template>

<script setup lang="ts">
const slots = useSlots();
const hasRightSlot = computed(() => Boolean(slots.right));
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/BlocksGrid";
</style>
