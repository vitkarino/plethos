import { createTimestamp, mockProjectUsers, mockProjects } from '../data/mock';

export default defineEventHandler((event) => {
	return readBody<{
		project_id?: number | string;
		user_id?: number | string;
	}>(event).then((body) => {
		const projectId = Number(body.project_id);
		const userId = Number(body.user_id);
		const assignmentIndex = mockProjectUsers.findIndex((item) => {
			return item.project_id === projectId && item.user_id === userId;
		});

		if (assignmentIndex === -1) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Assignment not found',
			});
		}

		const [deletedAssignment] = mockProjectUsers.splice(assignmentIndex, 1);
		const project = mockProjects.find((item) => item.id === projectId);

		if (project) {
			project.updated_at = createTimestamp();
		}

		return deletedAssignment;
	});
});
