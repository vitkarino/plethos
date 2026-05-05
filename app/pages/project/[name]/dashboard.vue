<template>
	<section v-if="viewModel.state.project" class="project-dashboard-page">
		<div class="project-dashboard-page__layout">
			<Block class="project-dashboard-page__summary">
				<p>{{ viewModel.state.project.description }}</p>

				<dl>
					<div>
						<dt>Створено</dt>
						<dd>{{ viewModel.formatDate(viewModel.state.project.created_at) }}</dd>
					</div>
					<div>
						<dt>Оновлено</dt>
						<dd>{{ viewModel.formatDate(viewModel.state.project.updated_at) }}</dd>
					</div>
					<div>
						<dt>Користувачі</dt>
						<dd>{{ viewModel.state.assignedUsers.length }}</dd>
					</div>
				</dl>
			</Block>

			<Block class="project-dashboard-page__users">
				<div class="project-dashboard-page__block-title">
					<p>Команда</p>
					<span>{{ viewModel.state.assignedUsers.length }}</span>
				</div>

				<div
					v-for="assignment in viewModel.state.assignedUsers"
					:key="assignment.user.id"
					class="project-dashboard-page__user"
				>
					<div>
						<strong>{{ assignment.user.name }}</strong>
						<small>{{ viewModel.sexLabel(assignment.user.sex) }} · {{ assignment.user.age }} років</small>
					</div>

					<span>{{ viewModel.formatDate(assignment.assigned_at) }}</span>
				</div>
			</Block>
		</div>
	</section>

	<section v-else-if="!viewModel.state.isLoading" class="project-dashboard-page">
	</section>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import { ProjectDashboardPageViewModel } from '~/controllers/pages/ProjectDashboardPageViewModel';

const route = useRoute();
const projectName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const viewModel = new ProjectDashboardPageViewModel(projectName ?? '');

usePageHeader({
	title: computed(() => viewModel.state.project?.title || viewModel.state.pageError || 'Проєкт'),
	subtitle: 'Дашборд проєкту',
	actions: [
		{
			label: 'Усі проєкти',
			to: '/projects',
		},
	],
});

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/project-dashboard";
</style>
