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

<style scoped>
.BlocksGrid {
	display: grid;
	width: 100%;
	height: 100%;
	grid-template-columns: 2fr 1.2fr;
	grid-template-rows: 1fr 1fr;
	grid-template-areas:
		"topLeft right"
		"bottomLeft right";
	gap: 1em;
}

.BlocksGrid__topLeft {
	grid-area: topLeft;
}

.BlocksGrid__bottomLeft {
	grid-area: bottomLeft;
}

.BlocksGrid__right {
	grid-area: right;
}

.BlocksGrid__topLeft,
.BlocksGrid__bottomLeft,
.BlocksGrid__right {
	min-width: 0;
}
</style>