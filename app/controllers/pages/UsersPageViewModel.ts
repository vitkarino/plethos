import { reactive } from 'vue'
import { PulsoApiModel } from '~/models/PulsoApiModel'
import type { UsersPageState } from '~/types/pages/users'
import type { User } from '~/types/shared/entities'
import {
	formatDateValue,
	getRequestErrorMessage,
	getSexIcon,
	getSexLabel,
	getUserInitials,
	getUserProjectTitles,
} from '~/utils/shared'

export class UsersPageViewModel {
	private readonly api = new PulsoApiModel()

	public readonly state = reactive<UsersPageState>({
		users: [],
		projects: [],
		projectUsers: [],
		userForm: {
			name: '',
			age: '',
			sex: 'male',
		},
		editingUserId: null,
		isUserModalOpen: false,
		isUserSaving: false,
		userFormError: '',
		pageError: '',
	})

	public initialize() {
		return Promise.all([
			this.refreshUsers(),
			this.loadProjects(),
			this.refreshProjectUsers(),
		]).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'Users data was not loaded')
		})
	}

	public refreshUsers() {
		return this.api.fetchUsers()
			.then((users) => {
				this.state.users = users
				return users
			})
	}

	public loadProjects() {
		return this.api.fetchProjects()
			.then((projects) => {
				this.state.projects = projects
				return projects
			})
	}

	public refreshProjectUsers() {
		return this.api.fetchProjectUsers()
			.then((projectUsers) => {
				this.state.projectUsers = projectUsers
				return projectUsers
			})
	}

	public sexLabel(sex: User['sex']) {
		return getSexLabel(sex)
	}

	public sexIcon(sex: User['sex']) {
		return getSexIcon(sex)
	}

	public userInitials(name: string) {
		return getUserInitials(name)
	}

	public userProjectTitlesList(userId: number) {
		return getUserProjectTitles(this.state.projects, this.state.projectUsers, userId)
	}

	public userProjectTitles(userId: number) {
		const titles = this.userProjectTitlesList(userId)
		return titles.length > 0 ? titles.join(', ') : 'No projects'
	}

	public openCreateUserModal() {
		this.resetUserForm()
		this.state.isUserModalOpen = true
	}

	public openEditUserModal(user: User) {
		this.state.editingUserId = user.id
		this.state.userForm.name = user.name
		this.state.userForm.age = user.age
		this.state.userForm.sex = user.sex
		this.state.userFormError = ''
		this.state.pageError = ''
		this.state.isUserModalOpen = true
	}

	public closeUserModal() {
		this.state.isUserModalOpen = false
		this.resetUserForm()
	}

	public saveUser() {
		const age = Number(this.state.userForm.age)

		if (!Number.isFinite(age)) {
			this.state.userFormError = 'Invalid age'
			return Promise.resolve()
		}

		const body = {
			name: this.state.userForm.name,
			age,
			sex: this.state.userForm.sex,
		}

		this.state.isUserSaving = true
		this.state.userFormError = ''
		this.state.pageError = ''

		const request = this.state.editingUserId
			? this.api.updateUser(this.state.editingUserId, body).then(() => undefined)
			: this.api.createUser(body).then(() => undefined)

		return request
			.then(() => {
				this.closeUserModal()
				return this.refreshUsers()
			})
			.then(() => undefined)
			.catch((error) => {
				this.state.userFormError = getRequestErrorMessage(error, 'User was not saved')
			})
			.finally(() => {
				this.state.isUserSaving = false
			})
	}

	public deleteUser(user: User | number) {
		const userId = typeof user === 'number' ? user : user.id
		const name = typeof user === 'number'
			? this.state.users.find((item) => item.id === userId)?.name
			: user.name

		if (!this.confirmDelete(name ? `Delete user "${name}"?` : 'Delete this user?')) {
			return Promise.resolve()
		}

		this.state.pageError = ''

		return this.api.deleteUser(userId).then(() => {
			if (this.state.editingUserId === userId) {
				this.resetUserForm()
			}

			return Promise.all([
				this.refreshUsers(),
				this.refreshProjectUsers(),
			])
		}).then(() => undefined).catch((error) => {
			this.state.pageError = getRequestErrorMessage(error, 'User was not deleted')
		})
	}

	public formatDate(value: string) {
		return formatDateValue(value)
	}

	private resetUserForm() {
		this.state.editingUserId = null
		this.state.userForm.name = ''
		this.state.userForm.age = ''
		this.state.userForm.sex = 'male'
		this.state.userFormError = ''
	}

	private confirmDelete(message: string) {
		return typeof window === 'undefined' || window.confirm(message)
	}
}
