<template>
	<div
		ref="rootElement"
		class="select-box"
		:class="{
			'select-box_open': isOpen,
			'select-box_disabled': disabled,
			'select-box_menu-top': menuPlacement === 'top',
		}"
	>
		<span v-if="label && !inlineLabel" class="select-box__label">{{ label }}</span>

		<button
			class="select-box__control"
			type="button"
			:disabled="disabled"
			:aria-expanded="isOpen"
			:aria-label="controlAriaLabel"
			@click="toggle"
		>
			<span v-if="label && inlineLabel" class="select-box__inline-label">
				<span
					v-if="labelIconClass"
					class="select-box__inline-icon"
					:class="labelIconClass"
					aria-hidden="true"
				></span>
				<span class="select-box__inline-text">{{ label }}</span>
			</span>
			<span class="select-box__value">{{ selectedOption?.label ?? placeholder }}</span>
			<span class="select-box__chevron" aria-hidden="true"></span>
		</button>

		<div
			v-if="isOpen"
			ref="menuElement"
			class="select-box__menu"
			:style="menuStyle"
		>
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

const rootElement = ref<HTMLElement | null>(null)
const menuElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const menuPlacement = ref<'top' | 'bottom'>('bottom')
const menuMaxHeight = ref('16em')
const menuTop = ref('0px')
const menuLeft = ref('0px')
const menuWidth = ref('0px')

const menuStyle = computed(() => ({
	position: 'fixed',
	top: menuTop.value,
	bottom: 'auto',
	left: menuLeft.value,
	width: menuWidth.value,
	maxHeight: menuMaxHeight.value,
}))

const normalizedOptions = computed<SelectBoxOption[]>(() => {
	const entries = Array.isArray(props.items)
		? props.items.map((item, index) => [String(index), item] as const)
		: Object.entries(props.items)

	return entries.map(([fallbackKey, item]) => normalizeOption(fallbackKey, item))
})

const selectedOption = computed(() => normalizedOptions.value.find((option) => option.value === props.modelValue) ?? null)
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

function closeOnOutsidePointerDown(event: PointerEvent) {
	if (!rootElement.value?.contains(event.target as Node)) {
		isOpen.value = false
	}
}

function closeOnEscape(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		isOpen.value = false
	}
}

function updateMenuPlacement() {
	const root = rootElement.value
	const menu = menuElement.value

	if (!root || !menu || !isOpen.value) {
		return
	}

	const rootRect = root.getBoundingClientRect()
	const menuHeight = menu.offsetHeight
	const viewportHeight = window.innerHeight
	const spacing = 8
	const availableBelow = viewportHeight - rootRect.bottom - spacing
	const availableAbove = rootRect.top - spacing
	const shouldOpenTop = availableBelow < menuHeight && availableAbove > availableBelow
	const availableHeight = shouldOpenTop ? availableAbove : availableBelow
	const nextMaxHeight = Math.max(availableHeight, 96)
	const nextMenuHeight = Math.min(menuHeight, nextMaxHeight)

	menuPlacement.value = shouldOpenTop ? 'top' : 'bottom'
	menuMaxHeight.value = `${nextMaxHeight}px`
	menuLeft.value = `${rootRect.left}px`
	menuTop.value = `${shouldOpenTop ? rootRect.top - spacing - nextMenuHeight : rootRect.bottom + spacing}px`
	menuWidth.value = `${rootRect.width}px`
}

function syncMenuPlacement() {
	nextTick(() => {
		updateMenuPlacement()
	})
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
	document.addEventListener('pointerdown', closeOnOutsidePointerDown)
	document.addEventListener('keydown', closeOnEscape)
	window.addEventListener('resize', syncMenuPlacement)
	window.addEventListener('scroll', syncMenuPlacement, true)
})

onBeforeUnmount(() => {
	document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
	document.removeEventListener('keydown', closeOnEscape)
	window.removeEventListener('resize', syncMenuPlacement)
	window.removeEventListener('scroll', syncMenuPlacement, true)
})

watch(isOpen, (open) => {
	if (!open) {
		menuPlacement.value = 'bottom'
		menuMaxHeight.value = '16em'
		menuTop.value = '0px'
		menuLeft.value = '0px'
		menuWidth.value = '0px'

		return
	}

	syncMenuPlacement()
})
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/components/SelectBox";
</style>
