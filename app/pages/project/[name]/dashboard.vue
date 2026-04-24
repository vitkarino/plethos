<template>
	<section v-if="viewModel.state.project" class="ProjectDashboardPage">
		<header class="ProjectDashboardPage__header">
			<div>
				<p>Project dashboard</p>
				<h1>{{ viewModel.state.project.title }}</h1>
			</div>

			<NuxtLink class="ProjectDashboardPage__back" to="/projects">
				All projects
			</NuxtLink>
		</header>

		<div class="ProjectDashboardPage__layout">
			<Block class="ProjectDashboardPage__summary">
				<p>{{ viewModel.state.project.description }}</p>

				<dl>
					<div>
						<dt>Created</dt>
						<dd>{{ viewModel.formatDate(viewModel.state.project.created_at) }}</dd>
					</div>
					<div>
						<dt>Updated</dt>
						<dd>{{ viewModel.formatDate(viewModel.state.project.updated_at) }}</dd>
					</div>
					<div>
						<dt>Assigned users</dt>
						<dd>{{ viewModel.state.assignedUsers.length }}</dd>
					</div>
				</dl>
			</Block>

			<Block class="ProjectDashboardPage__users">
				<div class="ProjectDashboardPage__blockTitle">
					<p>Team</p>
					<span>{{ viewModel.state.assignedUsers.length }}</span>
				</div>

				<div
					v-for="assignment in viewModel.state.assignedUsers"
					:key="assignment.user.id"
					class="ProjectDashboardPage__user"
				>
					<div>
						<strong>{{ assignment.user.name }}</strong>
						<small>{{ viewModel.sexLabel(assignment.user.sex) }} · {{ assignment.user.age }} years</small>
					</div>

					<span>{{ viewModel.formatDate(assignment.assigned_at) }}</span>
				</div>
			</Block>
		</div>
	</section>

	<section v-else-if="!viewModel.state.isLoading" class="ProjectDashboardPage">
		<header class="ProjectDashboardPage__header">
			<div>
				<p>Project dashboard</p>
				<h1>{{ viewModel.state.pageError }}</h1>
			</div>

			<NuxtLink class="ProjectDashboardPage__back" to="/projects">
				All projects
			</NuxtLink>
		</header>
	</section>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import { ProjectDashboardPageViewModel } from '~/controllers/pages/ProjectDashboardPageViewModel';

const route = useRoute();
const projectName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const viewModel = new ProjectDashboardPageViewModel(projectName ?? '');

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/project-dashboard";
</style>
