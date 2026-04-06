<template>
	<div class="AppLayout">
		<Sidebar>
			<template #top>
				<div class="AppLayout__logo">App</div>
			</template>

			<template #nav>
				<a class="AppLayout__link" href="#">Dashboard</a>
				<a class="AppLayout__link" href="#">Projects</a>
				<a class="AppLayout__link" href="#">AI Analysis</a>
			</template>

			<template #bottom>
				<a class="AppLayout__link" href="#">Made by Viktor Kysil</a>
			</template>
		</Sidebar>

		<main class="AppLayout__content">
			<slot />
		</main>
	</div>
</template>

<script setup lang="ts">
import Sidebar from '~/components/Sidebar.vue';
</script>

<style scoped>
.AppLayout {
	display: flex;
	min-height: 100vh;
}

.AppLayout__content {
	flex: 1;
	display: flex;
	justify-content: center;
	align-items: center;
	min-width: 0;
	padding: 1em;
}

.AppLayout__logo {
	font-size: 18pt;
	font-weight: 600;
}

.AppLayout__link {
	color: inherit;
	text-decoration: none;
}
</style>