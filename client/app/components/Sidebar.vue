<template>
	<aside class="sidebar sidebar_collapsed">
		<nav class="sidebar__nav">
			<slot name="nav" />
		</nav>

		<div v-if="$slots.bottom" class="sidebar__bottom">
			<slot name="bottom" />
		</div>
	</aside>
</template>

<style scoped lang="scss">
@use "~/assets/styles/components/Sidebar";
</style>
