<template>
	<aside class="sidebar">
		<div class="sidebar__top">
			<slot name="top" />
		</div>

		<nav class="sidebar__nav">
			<slot name="nav" />
		</nav>

		<div class="sidebar__bottom">
			<slot name="bottom" />
		</div>
	</aside>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/Sidebar";
</style>
