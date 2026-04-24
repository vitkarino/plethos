<template>
	<div class="BlocksGrid">
		<div class="BlocksGrid__topLeft">
			<slot name="topLeft" />
		</div>

		<div class="BlocksGrid__bottomLeft">
			<slot name="bottomLeft" />
		</div>

		<div class="BlocksGrid__right">
			<slot name="right" />
		</div>
	</div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use "~/styles/scss/components/BlocksGrid";
</style>
