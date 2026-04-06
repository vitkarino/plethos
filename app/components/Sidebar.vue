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

<style scoped>
.Sidebar {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	width: 280px;
	min-width: 280px;
	height: 100vh;
	padding: 2em 1em;
	box-sizing: border-box;
	background: #d9d9d9;
}

.Sidebar__top {
	display: flex;
	flex-direction: column;
	gap: 1em;
}

.Sidebar__nav {
	display: flex;
	flex-direction: column;
	gap: 1em;
	flex: 1;
	margin: 2em 0;
	min-height: 0;
}

.Sidebar__bottom {
	display: flex;
	flex-direction: column;
	gap: 1em;
}
</style>