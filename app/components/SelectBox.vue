<template>
	<div ref="rootElement" class="select-box" :class="{ 'select-box_open': isOpen, 'select-box_disabled': disabled }">
		<span v-if="label" class="select-box__label">{{ label }}</span>

		<button
			class="select-box__control"
			type="button"
			:disabled="disabled"
			:aria-expanded="isOpen"
			@click="toggle"
		>
			<span>{{ selectedOption?.label ?? placeholder }}</span>
			<span class="select-box__chevron" aria-hidden="true"></span>
		</button>

		<div v-if="isOpen" class="select-box__menu">
			<button
				v-for="option in normalizedOptions"
				:key="option.key"
				class="select-box__option"
				:class="{ 'select-box__option_selected': option.key === selectedOption?.key }"
				type="button"
				@click="selectOption(option)"
			>
				{{ option.label }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
type SelectBoxValue = string | number | null
type SelectBoxItem = SelectBoxValue | Record<string, unknown>
type SelectBoxItems = SelectBoxItem[] | Record<string, SelectBoxItem>

type SelectBoxOption = {
	key: string
	label: string
	value: SelectBoxValue
}

const props = withDefaults(defineProps<{
	items: SelectBoxItems
	modelValue?: SelectBoxValue
	label?: string
	placeholder?: string
	labelKey?: string
	valueKey?: string
	disabled?: boolean
}>(), {
	modelValue: '',
	label: '',
	placeholder: '',
	labelKey: 'label',
	valueKey: 'value',
	disabled: false,
})

const emit = defineEmits<{
	'update:modelValue': [value: SelectBoxValue]
}>()

const rootElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const normalizedOptions = computed<SelectBoxOption[]>(() => {
	const entries = Array.isArray(props.items)
		? props.items.map((item, index) => [String(index), item] as const)
		: Object.entries(props.items)

	return entries.map(([fallbackKey, item]) => normalizeOption(fallbackKey, item))
})

const selectedOption = computed(() => normalizedOptions.value.find((option) => option.value === props.modelValue) ?? null)

function normalizeOption(fallbackKey: string, item: SelectBoxItem): SelectBoxOption {
	if (isOptionRecord(item)) {
		const value = toSelectValue(item[props.valueKey] ?? fallbackKey)
		const label = String(item[props.labelKey] ?? item.name ?? item.title ?? value)

		return {
			key: serializeValue(value, fallbackKey),
			label,
			value,
		}
	}

	const value = toSelectValue(item)

	return {
		key: serializeValue(value, fallbackKey),
		label: String(item),
		value,
	}
}

function toggle() {
	if (props.disabled) {
		return
	}

	isOpen.value = !isOpen.value
}

function selectOption(option: SelectBoxOption) {
	emit('update:modelValue', option.value)
	isOpen.value = false
}

function closeOnOutsideClick(event: MouseEvent) {
	if (!rootElement.value?.contains(event.target as Node)) {
		isOpen.value = false
	}
}

function isOptionRecord(item: SelectBoxItem): item is Record<string, unknown> {
	return Boolean(item) && typeof item === 'object'
}

function toSelectValue(value: unknown): SelectBoxValue {
	if (typeof value === 'string' || typeof value === 'number') {
		return value
	}

	return value === null ? null : String(value ?? '')
}

function serializeValue(value: SelectBoxValue, fallbackKey: string) {
	return `${typeof value}:${String(value)}:${fallbackKey}`
}

onMounted(() => {
	document.addEventListener('click', closeOnOutsideClick)
})

onBeforeUnmount(() => {
	document.removeEventListener('click', closeOnOutsideClick)
})
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/SelectBox";
</style>
