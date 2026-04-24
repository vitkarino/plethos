import type { Project as MockProject, ProjectUser as MockProjectUser, User as MockUser } from '../../app/types/shared/entities';

export const mockUsers: MockUser[] = [
	{
		id: 1,
		name: 'Віктор Кисіль',
		age: 22,
		sex: 'male',
		created_at: '2026-01-12T09:18:00.000Z',
		updated_at: '2026-04-18T14:42:00.000Z',
	},
	{
		id: 2,
		name: 'Олена Марченко',
		age: 29,
		sex: 'female',
		created_at: '2026-02-04T11:30:00.000Z',
		updated_at: '2026-04-20T08:10:00.000Z',
	},
	{
		id: 3,
		name: 'Максим Савчук',
		age: 35,
		sex: 'male',
		created_at: '2026-02-19T16:05:00.000Z',
		updated_at: '2026-04-19T17:25:00.000Z',
	},
	{
		id: 4,
		name: 'Ірина Бондар',
		age: 31,
		sex: 'female',
		created_at: '2026-03-02T13:48:00.000Z',
		updated_at: '2026-04-21T12:30:00.000Z',
	},
];

export const mockProjects: MockProject[] = [
	{
		id: 1,
		title: 'Pulse Monitor',
		description: 'Live pulse capture, normalization, and operator review workspace.',
		created_at: '2026-01-20T10:00:00.000Z',
		updated_at: '2026-04-22T15:22:00.000Z',
	},
	{
		id: 2,
		title: 'Signal Lab',
		description: 'Experiment bench for comparing filtered recordings and AI notes.',
		created_at: '2026-02-14T12:15:00.000Z',
		updated_at: '2026-04-19T09:40:00.000Z',
	},
	{
		id: 3,
		title: 'Care Review',
		description: 'Shared project for assigned reviewers and patient-session summaries.',
		created_at: '2026-03-06T08:45:00.000Z',
		updated_at: '2026-04-23T18:05:00.000Z',
	},
];

export const mockProjectUsers: MockProjectUser[] = [
	{
		project_id: 1,
		user_id: 1,
		assigned_at: '2026-01-21T08:00:00.000Z',
	},
	{
		project_id: 1,
		user_id: 2,
		assigned_at: '2026-02-10T12:30:00.000Z',
	},
	{
		project_id: 2,
		user_id: 1,
		assigned_at: '2026-02-15T09:10:00.000Z',
	},
	{
		project_id: 2,
		user_id: 3,
		assigned_at: '2026-02-21T15:20:00.000Z',
	},
	{
		project_id: 3,
		user_id: 2,
		assigned_at: '2026-03-08T11:45:00.000Z',
	},
	{
		project_id: 3,
		user_id: 4,
		assigned_at: '2026-03-10T10:15:00.000Z',
	},
];

export function createTimestamp() {
	return new Date().toISOString();
}

export function getNextId<T extends { id: number }>(items: T[]) {
	return items.reduce((highestId, item) => Math.max(highestId, item.id), 0) + 1;
}
