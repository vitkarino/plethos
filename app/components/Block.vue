<template>
	<div class="block">
		<header v-if="$slots.header || $slots.headerActions" class="block__header">
			<h2 v-if="$slots.header" class="block__heading">
				<slot name="header" />
			</h2>
			<div v-if="$slots.headerActions" class="block__header-actions">
				<slot name="headerActions" />
			</div>
		</header>
		<div class="block__content">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/Block";
</style>
