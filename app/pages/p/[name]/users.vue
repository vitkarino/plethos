<template>
	<section class="users-page">
		<header class="users-page__header">
			<h1>Користувачі <span>· {{ viewModel.state.users.length }}</span></h1>

			<div class="users-page__header-actions">
				<button class="users-page__button users-page__button_primary users-page__button_add" type="button" @click="viewModel.openCreateUserModal()">
					Add user
				</button>
			</div>
		</header>

		<p v-if="viewModel.state.pageError" class="users-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<Block class="users-page__table">
			<div class="users-page__row users-page__row_head">
				<span>Name</span>
				<span>Projects</span>
				<span>Updated</span>
				<span>Actions</span>
			</div>

			<div
				v-for="user in viewModel.state.users"
				:key="user.id"
				class="users-page__row"
			>
				<div class="users-page__identity">
					<span class="users-page__avatar" aria-hidden="true">{{ viewModel.userInitials(user.name) }}</span>
					<span>
						<strong>{{ user.name }} <small>· {{ viewModel.sexIcon(user.sex) }} {{ user.age }}</small></strong>
						<small>ID {{ user.id }} · Created {{ viewModel.formatDate(user.created_at) }}</small>
					</span>
				</div>
				<div class="users-page__chips">
					<template v-if="viewModel.userProjectTitlesList(user.id).length">
						<span
							v-for="title in viewModel.userProjectTitlesList(user.id).slice(0, 3)"
							:key="title"
							class="users-page__chip"
						>
							{{ title }}
						</span>
						<span v-if="viewModel.userProjectTitlesList(user.id).length > 3" class="users-page__chip users-page__chip_more">
							+{{ viewModel.userProjectTitlesList(user.id).length - 3 }}
						</span>
					</template>
					<span v-else class="users-page__empty">No projects</span>
				</div>
				<span>{{ viewModel.formatDate(user.updated_at) }}</span>
				<ToolTip class="users-page__menu" aria-label="User actions">
					<button type="button" @click="viewModel.openEditUserModal(user)">
						Edit
					</button>
					<button type="button" class="tool-tip__menu-danger" @click="viewModel.deleteUser(user)">
						Remove
					</button>
				</ToolTip>
			</div>
		</Block>

		<Modal
			:is-open="viewModel.state.isUserModalOpen"
			:title="viewModel.state.editingUserId ? 'Edit user' : 'New user'"
			:submit-label="viewModel.state.editingUserId ? 'Save changes' : 'Create user'"
			:submit-disabled="viewModel.state.isUserSaving"
			width="30em"
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

			<p v-if="viewModel.state.userFormError" class="users-page__form-error">
				{{ viewModel.state.userFormError }}
			</p>
		</Modal>
	</section>
</template>

<script setup lang="ts">
import Block from '~/components/Block.vue';
import Modal from '~/components/Modal.vue';
import ToolTip from '~/components/ToolTip.vue';
import { UsersPageViewModel } from '~/controllers/pages/UsersPageViewModel';

const viewModel = new UsersPageViewModel();

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/users";
</style>
