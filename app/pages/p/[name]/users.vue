<template>
	<section class="users-page">
		<header class="users-page__header">
			<h1>Користувачі системи</h1>

			<div class="users-page__header-actions">
				<span class="users-page__counter">{{ viewModel.state.users.length }}</span>
				<button class="users-page__button" type="button" @click="viewModel.openCreateUserModal()">
					New user
				</button>
			</div>
		</header>

		<p v-if="viewModel.state.pageError" class="users-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<Block class="users-page__table">
			<div class="users-page__row users-page__row_head">
				<span>Name</span>
				<span>Age</span>
				<span>Sex</span>
				<span>Projects</span>
				<span>Updated</span>
				<span>Actions</span>
			</div>

			<div
				v-for="user in viewModel.state.users"
				:key="user.id"
				class="users-page__row"
			>
				<span>
					<strong>{{ user.name }}</strong>
					<small>ID {{ user.id }} · Created {{ viewModel.formatDate(user.created_at) }}</small>
				</span>
				<span>{{ user.age }}</span>
				<span>{{ viewModel.sexLabel(user.sex) }}</span>
				<span>{{ viewModel.userProjectTitles(user.id) }}</span>
				<span>{{ viewModel.formatDate(user.updated_at) }}</span>
				<span class="users-page__actions">
					<button class="users-page__button" type="button" @click="viewModel.openEditUserModal(user)">
						Edit
					</button>
					<button
						class="users-page__button users-page__button_danger"
						type="button"
						@click="viewModel.deleteUser(user)"
					>
						Remove
					</button>
				</span>
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
import { UsersPageViewModel } from '~/controllers/pages/UsersPageViewModel';

const viewModel = new UsersPageViewModel();

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/users";
</style>
