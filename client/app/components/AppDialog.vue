<template>
	<Teleport to="body">
		<dialog
			ref="dialogEl"
			class="app-dialog"
			:style="dialogStyle"
			:aria-label="title"
			@click="handleBackdropClick"
			@close="handleClose"
		>
			<form class="app-dialog__panel" @submit.prevent="emit('submit')">
				<div class="app-dialog__header">
					<h2>{{ title }}</h2>

					<button class="app-dialog__close" type="button" :aria-label="closeLabel" @click="requestClose">
						<span aria-hidden="true"></span>
					</button>
				</div>

				<div class="app-dialog__body">
					<slot />
				</div>

				<footer v-if="$slots.actions || submitLabel" class="app-dialog__footer">
					<slot name="actions">
						<button class="app-dialog__button app-dialog__button_ghost" type="button" @click="requestClose">
							<span class="app-dialog__button-icon app-dialog__button-icon_cancel" aria-hidden="true"></span>
							{{ cancelLabel }}
						</button>
						<button class="app-dialog__button app-dialog__button_primary" type="submit" :disabled="submitDisabled">
							<span class="app-dialog__button-icon app-dialog__button-icon_save" aria-hidden="true"></span>
							{{ submitLabel }}
						</button>
					</slot>
				</footer>
			</form>
		</dialog>
	</Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

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
	closeLabel: 'Закрити',
	cancelLabel: 'Скасувати',
	submitLabel: '',
	submitDisabled: false,
	width: '34em',
	zIndex: 30,
});

const emit = defineEmits<{
	close: [];
	submit: [];
}>();

const dialogEl = ref<HTMLDialogElement | null>(null);

const dialogStyle = computed(() => ({
	'--dialog-width': props.width,
	'--dialog-z-index': String(props.zIndex),
}));

function syncDialogOpenState() {
	const dialog = dialogEl.value;
	if (!dialog) {
		return;
	}

	if (props.isOpen) {
		if (!dialog.open) {
			dialog.showModal();
		}
		return;
	}

	if (dialog.open) {
		dialog.close();
	}
}

onMounted(syncDialogOpenState);

watch(() => props.isOpen, syncDialogOpenState);

function requestClose() {
	dialogEl.value?.close();
}

function handleClose() {
	emit('close');
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === dialogEl.value) {
		requestClose();
	}
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/components/AppDialog";
</style>
