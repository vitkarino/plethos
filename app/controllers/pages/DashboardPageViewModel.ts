import { reactive } from 'vue'
import type { DashboardPageState } from '~/types/pages/dashboard'

export class DashboardPageViewModel {
	public readonly state = reactive<DashboardPageState>({
		projectsLabel: 'Projects',
		analysisLabel: 'AI Analysis',
	})
}
