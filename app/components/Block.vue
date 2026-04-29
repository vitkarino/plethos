<template>
	<div class="block">
		<header v-if="$slots.header" class="block__header">
			<slot name="header" />
		</header>
		<div class="block__content">
			<slot />
		</div>
		<footer v-if="$slots.footer" class="block__footer">
			<slot name="footer" />
		</footer>
	</div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/Block";
</style>
