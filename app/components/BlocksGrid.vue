<template>
	<div class="blocks-grid">
		<div class="blocks-grid__top-left">
			<slot name="topLeft" />
		</div>

		<div class="blocks-grid__bottom-left">
			<slot name="bottomLeft" />
		</div>

		<div class="blocks-grid__right">
			<slot name="right" />
		</div>
	</div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/BlocksGrid";
</style>
