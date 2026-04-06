<template>
	<BlocksGrid>
		<template #topLeft>
			<BPMBlock />
		</template>

		<template #bottomLeft>
			<Block>
				<p>Projects</p>
			</Block>
		</template>

		<template #right>
			<Block>
				<p>AI Analysis</p>
			</Block>
		</template>
	</BlocksGrid>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import BlocksGrid from '~/components/BlocksGrid.vue';
import BPMBlock from '~/components/BPMBlock.vue';
</script>