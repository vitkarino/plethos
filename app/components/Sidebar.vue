<template>
	<aside class="Sidebar">
		<div class="Sidebar__top">
			<slot name="top" />
		</div>

		<nav class="Sidebar__nav">
			<slot name="nav" />
		</nav>

		<div class="Sidebar__bottom">
			<slot name="bottom" />
		</div>
	</aside>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use "~/styles/scss/Sidebar";
</style>
