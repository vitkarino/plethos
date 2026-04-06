<template>
	<Block class="BPMBlock">
		<p class="BPMBlock__text">hello world</p>
		<p class="BPMBlock__text">there</p>
	</Block>
</template>

<script setup lang="ts">
import Block from './Block.vue';
</script>

<style scoped>
.BPMBlock {
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.BPMBlock__text {
	margin: 0;
}
</style>