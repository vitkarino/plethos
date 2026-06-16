import { computed, reactive } from 'vue'
import type { BPMBlockViewModel } from '~/controllers/components/BPMBlockViewModel'

type MeasurementSessionState = {
	controller: BPMBlockViewModel | null
}

const state = reactive<MeasurementSessionState>({
	controller: null,
})

export function useMeasurementSession() {
	const isActive = computed(() => state.controller?.isMeasurementActive() ?? false)

	function register(controller: BPMBlockViewModel) {
		state.controller = controller
	}

	function unregister(controller: BPMBlockViewModel) {
		if (state.controller === controller) {
			state.controller = null
		}
	}

	function confirmExit() {
		if (!isActive.value) {
			return Promise.resolve(true)
		}

		return Promise.resolve(
			typeof window === 'undefined' || window.confirm('Вийти з режиму вимірювання?'),
		)
	}

	function stopIfActive() {
		if (!state.controller?.isMeasurementActive()) {
			return Promise.resolve()
		}

		return state.controller.stopMeasurement()
	}

	return {
		isActive,
		register,
		unregister,
		confirmExit,
		stopIfActive,
	}
}
