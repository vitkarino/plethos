<template>
	<div class="Block">
		<slot />
	</div>
</template>

<script setup lang="ts"></script>

<style scoped>
.Block {
	width: 100%;
	height: 100%;
	padding: 24px;
	border-radius: 24px;
	background: #d9d9d9;
	box-sizing: border-box;
}
</style>