import { reactive } from 'vue'
import type { IndexPageState } from '~/types/pages/index'

export class IndexPageViewModel {
	public readonly state = reactive<IndexPageState>({
		redirectPath: '/dashboard',
	})

	public redirect() {
		return Promise.resolve(
			navigateTo(this.state.redirectPath, { replace: true }),
		).catch(() => undefined)
	}
}
