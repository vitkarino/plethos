<template>
	<Teleport to="body">
		<div
			v-if="isOpen"
			class="modal-overlay"
			:style="modalStyle"
			@click.self="emit('close')"
		>
			<form
				class="modal"
				role="dialog"
				aria-modal="true"
				:aria-label="title"
				@submit.prevent="emit('submit')"
			>
				<div class="modal__header">
					<h2>{{ title }}</h2>

					<button class="modal__button modal__button_ghost" type="button" @click="emit('close')">
						{{ closeLabel }}
					</button>
				</div>

				<div class="modal__body">
					<slot />
				</div>

				<div v-if="$slots.actions || submitLabel" class="modal__actions">
					<slot name="actions">
						<button class="modal__button modal__button_ghost" type="button" @click="emit('close')">
							{{ cancelLabel }}
						</button>
						<button class="modal__button modal__button_primary" type="submit" :disabled="submitDisabled">
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
