<template>
	<section class="ProjectsPage">
		<header class="ProjectsPage__header">
			<h1>{{ viewModel.state.projects.length ? 'Активні проєкти' : 'Створіть перший проєкт' }}</h1>

			<div class="ProjectsPage__headerActions">
				<span class="ProjectsPage__counter">{{ viewModel.state.projects.length }}</span>
				<button
					v-if="viewModel.state.projects.length"
					class="ProjectsPage__button"
					type="button"
					@click="viewModel.openCreateProjectModal()"
				>
					New project
				</button>
			</div>
		</header>

		<p v-if="viewModel.state.pageError" class="ProjectsPage__formError">
			{{ viewModel.state.pageError }}
		</p>

		<Block v-if="!viewModel.state.projects.length" class="ProjectsPage__emptyCreate">
			<form class="ProjectsPage__createForm" @submit.prevent="viewModel.saveProject()">
				<label>
					<span>Title</span>
					<input v-model.trim="viewModel.state.projectForm.title" type="text" required />
				</label>

				<label>
					<span>Description</span>
					<textarea v-model.trim="viewModel.state.projectForm.description" rows="5" required></textarea>
				</label>

				<button
					class="ProjectsPage__button ProjectsPage__button--primary"
					type="submit"
					:disabled="viewModel.state.isProjectSaving"
				>
					Create project
				</button>
			</form>
		</Block>

		<div v-else class="ProjectsPage__grid">
			<Block
				v-for="project in viewModel.state.projects"
				:key="project.id"
				class="ProjectsPage__project"
				:class="{ 'ProjectsPage__project--selected': viewModel.isProjectSelected(project) }"
			>
				<div class="ProjectsPage__projectHeader">
					<div>
						<p>Project #{{ project.id }}</p>
						<h2>{{ project.title }}</h2>
					</div>

					<span :class="{ 'ProjectsPage__selectedBadge': viewModel.isProjectSelected(project) }">
						{{ viewModel.isProjectSelected(project) ? 'Selected · ' : '' }}{{ viewModel.projectUserCount(project.id) }} users
					</span>
				</div>

				<p class="ProjectsPage__description">{{ project.description }}</p>

				<div class="ProjectsPage__assignments">
					<div class="ProjectsPage__sectionTitle">
						<span>Assigned users</span>
					</div>

					<div v-if="viewModel.assignedUsers(project.id).length" class="ProjectsPage__chips">
						<div
							v-for="assignment in viewModel.assignedUsers(project.id)"
							:key="assignment.user.id"
							class="ProjectsPage__chip"
						>
							<span>{{ assignment.user.name }}</span>
							<div class="ProjectsPage__chipActions">
								<button
									class="ProjectsPage__iconButton ProjectsPage__iconButton--edit"
									type="button"
									title="Edit user"
									aria-label="Edit user"
									@click="viewModel.openEditUserModal(assignment.user)"
								></button>
								<button
									class="ProjectsPage__iconButton ProjectsPage__iconButton--delete"
									type="button"
									title="Remove user from project"
									aria-label="Remove user from project"
									@click="viewModel.unassignUser(project.id, assignment.user.id)"
								></button>
							</div>
						</div>
					</div>

					<p v-else class="ProjectsPage__empty">No assigned users</p>

					<form class="ProjectsPage__assignForm" @submit.prevent="viewModel.assignUser(project.id)">
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
							class="ProjectsPage__button"
							type="submit"
							:disabled="viewModel.unassignedUsers(project.id).length === 0"
						>
							Assign
						</button>
					</form>
				</div>

				<dl class="ProjectsPage__meta">
					<div>
						<dt>Created</dt>
						<dd>{{ viewModel.formatDate(project.created_at) }}</dd>
					</div>
					<div>
						<dt>Updated</dt>
						<dd>{{ viewModel.formatDate(project.updated_at) }}</dd>
					</div>
				</dl>

				<div class="ProjectsPage__projectActions">
					<NuxtLink
						class="ProjectsPage__button ProjectsPage__button--primary"
						:to="viewModel.projectDashboardPath(project)"
						@click="viewModel.selectProject(project)"
					>
						{{ viewModel.isProjectSelected(project) ? 'Open' : 'Select and open' }}
					</NuxtLink>
					<button class="ProjectsPage__button" type="button" @click="viewModel.openEditProjectModal(project)">
						Edit
					</button>
					<button
						class="ProjectsPage__button ProjectsPage__button--danger"
						type="button"
						@click="viewModel.deleteProject(project)"
					>
						Remove
					</button>
				</div>
			</Block>
		</div>

		<Teleport to="body">
			<div
				v-if="viewModel.state.isProjectModalOpen"
				class="ProjectsPage__modalOverlay"
				@click.self="viewModel.closeProjectModal()"
			>
				<form class="ProjectsPage__modal" @submit.prevent="viewModel.saveProject()">
					<div class="ProjectsPage__modalHeader">
						<h2>{{ viewModel.state.editingProjectId ? 'Edit project' : 'New project' }}</h2>

						<button
							class="ProjectsPage__button ProjectsPage__button--ghost"
							type="button"
							@click="viewModel.closeProjectModal()"
						>
							Close
						</button>
					</div>

					<label>
						<span>Title</span>
						<input v-model.trim="viewModel.state.projectForm.title" type="text" required />
					</label>

					<label>
						<span>Description</span>
						<textarea v-model.trim="viewModel.state.projectForm.description" rows="4" required></textarea>
					</label>

					<p v-if="viewModel.state.projectFormError" class="ProjectsPage__formError">
						{{ viewModel.state.projectFormError }}
					</p>

					<div class="ProjectsPage__modalActions">
						<button
							class="ProjectsPage__button ProjectsPage__button--ghost"
							type="button"
							@click="viewModel.closeProjectModal()"
						>
							Cancel
						</button>
						<button
							class="ProjectsPage__button ProjectsPage__button--primary"
							type="submit"
							:disabled="viewModel.state.isProjectSaving"
						>
							{{ viewModel.state.editingProjectId ? 'Save changes' : 'Create project' }}
						</button>
					</div>
				</form>
			</div>
		</Teleport>

		<Teleport to="body">
			<div
				v-if="viewModel.state.isUserModalOpen"
				class="ProjectsPage__modalOverlay"
				@click.self="viewModel.closeUserModal()"
			>
				<form class="ProjectsPage__modal" @submit.prevent="viewModel.saveUser()">
					<div class="ProjectsPage__modalHeader">
						<h2>Edit user</h2>

						<button
							class="ProjectsPage__button ProjectsPage__button--ghost"
							type="button"
							@click="viewModel.closeUserModal()"
						>
							Close
						</button>
					</div>

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

					<p v-if="viewModel.state.userFormError" class="ProjectsPage__formError">
						{{ viewModel.state.userFormError }}
					</p>

					<div class="ProjectsPage__modalActions">
						<button
							class="ProjectsPage__button ProjectsPage__button--ghost"
							type="button"
							@click="viewModel.closeUserModal()"
						>
							Cancel
						</button>
						<button
							class="ProjectsPage__button ProjectsPage__button--primary"
							type="submit"
							:disabled="viewModel.state.isUserSaving"
						>
							Save changes
						</button>
					</div>
				</form>
			</div>
		</Teleport>
	</section>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import { ProjectsPageViewModel } from '~/controllers/pages/ProjectsPageViewModel';

const viewModel = new ProjectsPageViewModel();

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/styles/scss/pages/projects";
</style>
