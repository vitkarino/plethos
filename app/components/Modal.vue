<template>
	<Teleport to="body">
		<div
			v-if="isOpen"
			class="ModalOverlay"
			:style="modalStyle"
			@click.self="emit('close')"
		>
			<form
				class="Modal"
				role="dialog"
				aria-modal="true"
				:aria-label="title"
				@submit.prevent="emit('submit')"
			>
				<div class="Modal__header">
					<h2>{{ title }}</h2>

					<button class="Modal__button Modal__button--ghost" type="button" @click="emit('close')">
						{{ closeLabel }}
					</button>
				</div>

				<div class="Modal__body">
					<slot />
				</div>

				<div v-if="$slots.actions || submitLabel" class="Modal__actions">
					<slot name="actions">
						<button class="Modal__button Modal__button--ghost" type="button" @click="emit('close')">
							{{ cancelLabel }}
						</button>
						<button class="Modal__button Modal__button--primary" type="submit" :disabled="submitDisabled">
							{{ submitLabel }}
						</button>
					</slot>
				</div>
			</form>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
	isOpen: boolean;
	title: string;
	closeLabel?: string;
	cancelLabel?: string;
	submitLabel?: string;
	submitDisabled?: boolean;
	width?: string;
	zIndex?: number;
}>(), {
	closeLabel: 'Close',
	cancelLabel: 'Cancel',
	submitLabel: '',
	submitDisabled: false,
	width: '34em',
	zIndex: 30,
});

const emit = defineEmits<{
	close: [];
	submit: [];
}>();

const modalStyle = computed(() => ({
	'--modal-width': props.width,
	'--modal-z-index': String(props.zIndex),
}));
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/Modal";
</style>
