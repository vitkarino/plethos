<template>
	<label
		class="select-box"
		:class="{
			'select-box_disabled': disabled,
			'select-box_inline': inlineLabel,
		}"
	>
		<span v-if="label && !inlineLabel" class="select-box__label">{{ label }}</span>

		<span class="select-box__native-wrap">
			<span v-if="label && inlineLabel" class="select-box__inline-label">
				<span
					v-if="labelIconClass"
					class="select-box__inline-icon"
					:class="labelIconClass"
					aria-hidden="true"
				></span>
				<span class="select-box__inline-text">{{ label }}</span>
			</span>

			<select
				class="select-box__control"
				:value="selectedDomValue"
				:disabled="disabled"
				:aria-label="controlAriaLabel"
				@change="handleChange"
			>
				<option v-if="placeholder" :value="placeholderOptionKey" disabled>{{ placeholder }}</option>
				<option
					v-for="option in normalizedOptions"
					:key="option.key"
					:value="option.key"
				>
					{{ option.label }}
				</option>
			</select>
		</span>
	</label>
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
	inlineLabel?: boolean
	labelIconClass?: string
	placeholder?: string
	labelKey?: string
	valueKey?: string
	disabled?: boolean
}>(), {
	modelValue: '',
	label: '',
	inlineLabel: false,
	labelIconClass: '',
	placeholder: '',
	labelKey: 'label',
	valueKey: 'value',
	disabled: false,
})

const emit = defineEmits<{
	'update:modelValue': [value: SelectBoxValue]
}>()

const normalizedOptions = computed<SelectBoxOption[]>(() => {
	const entries = Array.isArray(props.items)
		? props.items.map((item, index) => [String(index), item] as const)
		: Object.entries(props.items)

	return entries.map(([fallbackKey, item]) => normalizeOption(fallbackKey, item))
})

const selectedOption = computed(() => normalizedOptions.value.find((option) => option.value === props.modelValue) ?? null)
const placeholderOptionKey = '__select-box-placeholder__'
const selectedDomValue = computed(() => selectedOption.value?.key ?? (props.placeholder ? placeholderOptionKey : ''))
const controlAriaLabel = computed(() => {
	const value = selectedOption.value?.label ?? props.placeholder

	return props.label && value ? `${props.label}: ${value}` : props.label || undefined
})

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

function handleChange(event: Event) {
	const option = normalizedOptions.value.find((item) => item.key === (event.target as HTMLSelectElement).value)

	if (option) {
		emit('update:modelValue', option.value)
	}
}
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/SelectBox";
</style>
