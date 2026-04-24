<template>
	<div class="AppLayout">
		<Sidebar>
			<template #top>
				<div class="AppLayout__logo">Pulso</div>
			</template>

			<template #nav>
				<NuxtLink class="AppLayout__link" to="/">Головна</NuxtLink>
				<a class="AppLayout__link" href="#">Проєкти</a>
				<a class="AppLayout__link" href="#">Користувачі</a>
				<NuxtLink class="AppLayout__link" to="/ai">ШІ Чат</NuxtLink>
				<a class="AppLayout__link" href="#">Редактор сигналів</a>
			</template>

			<template #bottom>
				<a class="AppLayout__link" href="#">Автор - Віктор Кисіль</a>
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

<style scoped lang="scss">
@use "~/styles/scss/layouts/default";
</style>
