<template>
	<section class="users-page">
		<p v-if="viewModel.state.pageError" class="users-page__form-error">
			{{ viewModel.state.pageError }}
		</p>

		<div class="users-page__grid">
			<article
				v-for="user in viewModel.state.users"
				:key="user.id"
				class="users-page__card"
				role="button"
				tabindex="0"
				@click="viewModel.openEditUserModal(user)"
				@keydown.enter.prevent="viewModel.openEditUserModal(user)"
				@keydown.space.prevent="viewModel.openEditUserModal(user)"
			>
				<div class="users-page__identity">
					<span class="users-page__avatar" aria-hidden="true">{{ viewModel.userInitials(user.name) }}</span>
					<div class="users-page__identity-text">
						<h2>{{ user.name }}</h2>
						<div class="users-page__details">
							<span>{{ user.age }} років</span>
							<span v-if="user.sex === 'other' || user.sex === null">Інше</span>
							<span v-else class="users-page__sex" :aria-label="viewModel.sexLabel(user.sex)">
								{{ viewModel.sexIcon(user.sex) }}
							</span>
						</div>
					</div>
				</div>

				<div class="users-page__projects">
					<span class="users-page__section-label">Проєкти</span>
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
						<span v-else class="users-page__empty">Немає проєктів</span>
					</div>
				</div>

				<div class="users-page__actions" @click.stop>
					<button class="users-page__button" type="button" @click="viewModel.openEditUserModal(user)">
						Редагувати
					</button>
					<button class="users-page__button users-page__button_delete" type="button" :aria-label="`Видалити ${user.name}`" @click="viewModel.deleteUser(user)">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
					</button>
				</div>
			</article>

			<button
				class="users-page__card users-page__card_add"
				type="button"
				@click="viewModel.openCreateUserModal()"
			>
				<span class="users-page__add-icon" aria-hidden="true"></span>
				<span>Додати користувача</span>
			</button>
		</div>

		<Modal
			:is-open="viewModel.state.isUserModalOpen"
			:title="viewModel.state.editingUserId ? 'Редагувати користувача' : 'Новий користувач'"
			:submit-label="viewModel.state.editingUserId ? 'Зберегти зміни' : 'Створити користувача'"
			:submit-disabled="viewModel.state.isUserSaving"
			width="30em"
			@close="viewModel.closeUserModal()"
			@submit="viewModel.saveUser()"
		>
			<label>
				<span>Ім'я</span>
				<input v-model.trim="viewModel.state.userForm.name" type="text" required />
			</label>

			<label>
				<span>Вік</span>
				<input v-model.number="viewModel.state.userForm.age" min="0" type="number" required />
			</label>

			<SelectBox v-model="viewModel.state.userForm.sex" label="Стать" :items="sexOptions" />

			<p v-if="viewModel.state.userFormError" class="users-page__form-error">
				{{ viewModel.state.userFormError }}
			</p>
		</Modal>
	</section>
</template>

<script setup lang="ts">
import Modal from '~/components/Modal.vue';
import SelectBox from '~/components/SelectBox.vue';
import ToolTip from '~/components/ToolTip.vue';
import { UsersPageViewModel } from '~/controllers/pages/UsersPageViewModel';

const viewModel = new UsersPageViewModel();
const sexOptions = [
	{ label: 'Чоловіча', value: 'male' },
	{ label: 'Жіноча', value: 'female' },
	{ label: 'Інше', value: 'other' },
];

usePageHeader({
	title: computed(() => `Користувачі · ${viewModel.state.users.length}`),
	actions: [
		{
			label: 'Додати користувача',
			variant: 'primary',
			icon: 'user-add',
			onClick: () => viewModel.openCreateUserModal(),
		},
	],
});

viewModel.initialize();
</script>

<style scoped lang="scss">
@use "~/assets/styles/scss/pages/users";
</style>
