<template>
	<aside class="sidebar" :class="{ 'sidebar_collapsed': collapsed }">
		<div class="sidebar__top">
			<slot name="top" />
			<button
				class="sidebar__toggle"
				type="button"
				:aria-label="collapsed ? 'Розгорнути сайдбар' : 'Згорнути сайдбар'"
				:title="collapsed ? 'Розгорнути' : 'Згорнути'"
				@click="$emit('toggle')"
			>
				<span aria-hidden="true"></span>
			</button>
		</div>

		<nav class="sidebar__nav">
			<slot name="nav" />
		</nav>

		<div class="sidebar__bottom">
			<slot name="bottom" />
		</div>
	</aside>
</template>

<script setup lang="ts">
defineProps<{
	collapsed?: boolean
}>()

defineEmits<{
	toggle: []
}>()
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/Sidebar";
</style>
