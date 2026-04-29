<template>
	<BlocksGrid>
		<template #topLeft>
			<BPMBlock>
				<template #header>
					<div class="block-header-data">Сигнал</div>
				</template>

				<template #footer>
					<div class="block-footer-data">
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">Пристрій:</span>
							<span class="block-footer-data__value">sim-device-1</span>
						</span>
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">ID:</span>
							<span class="block-footer-data__value">234823498243928</span>
						</span>
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">Температура сенсора:</span>
							<span class="block-footer-data__value">36 C</span>
						</span>
						<span class="block-footer-data__item">
							<span class="block-footer-data__label">Частота дискретизації:</span>
							<span class="block-footer-data__value">25</span>
						</span>
					</div>
				</template>
			</BPMBlock>
		</template>
	</BlocksGrid>
</template>

<script setup lang="ts">
import BlocksGrid from '~/components/BlocksGrid.vue';
import BPMBlock from '~/components/BPMBlock.vue';
</script>
