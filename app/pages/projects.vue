<template>
	<section class="projects-page">
		<header class="projects-page__header">
			<h1>{{ viewModel.state.projects.length ? 'Активні проєкти' : 'Створіть перший проєкт' }}</h1>

			<div class="projects-page__header-actions">
				<span class="projects-page__counter">{{ viewModel.state.projects.length }}</span>
				<button
					v-if="viewModel.state.projects.length"
					class="projects-page__button"
					type="button"
					@click="viewModel.openCreateProjectModal()"
				>
					New project
				</button>
			</div>
		</header>

		<p v-if="viewModel.state.pageError" class="projects-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<Block v-if="!viewModel.state.projects.length" class="projects-page__empty-create">
			<form class="projects-page__create-form" @submit.prevent="viewModel.saveProject()">
				<label>
					<span>Title</span>
					<input v-model.trim="viewModel.state.projectForm.title" type="text" required />
				</label>

				<label>
					<span>Description</span>
					<textarea v-model.trim="viewModel.state.projectForm.description" rows="5" required></textarea>
				</label>

				<button
					class="projects-page__button projects-page__button_primary"
					type="submit"
					:disabled="viewModel.state.isProjectSaving"
				>
					Create project
				</button>
			</form>
		</Block>

		<div v-else class="projects-page__grid">
			<Block
				v-for="project in viewModel.state.projects"
				:key="project.id"
				class="projects-page__project"
				:class="{ 'projects-page__project_selected': viewModel.isProjectSelected(project) }"
			>
				<div class="projects-page__project-header">
					<div>
						<p>Project #{{ project.id }}</p>
						<h2>{{ project.title }}</h2>
					</div>

					<span :class="{ 'projects-page__selected-badge': viewModel.isProjectSelected(project) }">
						{{ viewModel.isProjectSelected(project) ? 'Selected · ' : '' }}{{ viewModel.projectUserCount(project.id) }} users
					</span>
				</div>

				<p class="projects-page__description">{{ project.description }}</p>

				<div class="projects-page__assignments">
					<div class="projects-page__section-title">
						<span>Assigned users</span>
					</div>

					<div v-if="viewModel.assignedUsers(project.id).length" class="projects-page__chips">
						<div
							v-for="assignment in viewModel.assignedUsers(project.id)"
							:key="assignment.user.id"
							class="projects-page__chip"
						>
							<span>{{ assignment.user.name }}</span>
							<div class="projects-page__chip-actions">
								<button
									class="projects-page__icon-button projects-page__icon-button_edit"
									type="button"
									title="Edit user"
									aria-label="Edit user"
									@click="viewModel.openEditUserModal(assignment.user)"
								></button>
								<button
									class="projects-page__icon-button projects-page__icon-button_delete"
									type="button"
									title="Remove user from project"
									aria-label="Remove user from project"
									@click="viewModel.unassignUser(project.id, assignment.user.id)"
								></button>
							</div>
						</div>
					</div>

					<p v-else class="projects-page__empty">No assigned users</p>

					<form class="projects-page__assign-form" @submit.prevent="viewModel.assignUser(project.id)">
						<select
							v-model.number="viewModel.state.assignmentForms[project.id]"
							:disabled="viewModel.unassignedUsers(project.id).length === 0"
						>
							<option value="">
								{{ viewModel.unassignedUsers(project.id).length === 0 ? 'All users assigned' : 'Select user' }}
							</option>
							<option
								v-for="user in viewModel.unassignedUsers(project.id)"
								:key="user.id"
								:value="user.id"
							>
								{{ user.name }}
							</option>
						</select>

						<button
							class="projects-page__button"
							type="submit"
							:disabled="viewModel.unassignedUsers(project.id).length === 0"
						>
							Assign
						</button>
					</form>
				</div>

				<dl class="projects-page__meta">
					<div>
						<dt>Created</dt>
						<dd>{{ viewModel.formatDate(project.created_at) }}</dd>
					</div>
					<div>
						<dt>Updated</dt>
						<dd>{{ viewModel.formatDate(project.updated_at) }}</dd>
					</div>
				</dl>

				<div class="projects-page__project-actions">
					<NuxtLink
						class="projects-page__button projects-page__button_primary"
						:to="viewModel.projectDashboardPath(project)"
						@click="viewModel.selectProject(project)"
					>
						{{ viewModel.isProjectSelected(project) ? 'Open' : 'Select and open' }}
					</NuxtLink>
					<button class="projects-page__button" type="button" @click="viewModel.openEditProjectModal(project)">
						Edit
					</button>
					<button
						class="projects-page__button projects-page__button_danger"
						type="button"
						@click="viewModel.deleteProject(project)"
					>
						Remove
					</button>
				</div>
			</Block>
		</div>

		<Modal
			:is-open="viewModel.state.isProjectModalOpen"
			:title="viewModel.state.editingProjectId ? 'Edit project' : 'New project'"
			:submit-label="viewModel.state.editingProjectId ? 'Save changes' : 'Create project'"
			:submit-disabled="viewModel.state.isProjectSaving"
			@close="viewModel.closeProjectModal()"
			@submit="viewModel.saveProject()"
		>
			<label>
				<span>Title</span>
				<input v-model.trim="viewModel.state.projectForm.title" type="text" required />
			</label>

			<label>
				<span>Description</span>
				<textarea v-model.trim="viewModel.state.projectForm.description" rows="4" required></textarea>
			</label>

			<p v-if="viewModel.state.projectFormError" class="projects-page__form-error">
				{{ viewModel.state.projectFormError }}
			</p>
		</Modal>

		<Modal
			:is-open="viewModel.state.isUserModalOpen"
			title="Edit user"
			submit-label="Save changes"
			:submit-disabled="viewModel.state.isUserSaving"
			@close="viewModel.closeUserModal()"
			@submit="viewModel.saveUser()"
		>
			<label>
				<span>Name</span>
				<input v-model.trim="viewModel.state.userForm.name" type="text" required />
			</label>

			<label>
				<span>Age</span>
				<input v-model.number="viewModel.state.userForm.age" min="0" type="number" required />
			</label>

			<label>
				<span>Sex</span>
				<select v-model="viewModel.state.userForm.sex">
					<option value="male">Male</option>
					<option value="female">Female</option>
				</select>
			</label>

			<p v-if="viewModel.state.userFormError" class="projects-page__form-error">
				{{ viewModel.state.userFormError }}
			</p>
		</Modal>
	</section>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import Modal from '~/components/Modal.vue';
import { ProjectsPageViewModel } from '~/controllers/pages/ProjectsPageViewModel';

const viewModel = new ProjectsPageViewModel();

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/projects";
</style>
