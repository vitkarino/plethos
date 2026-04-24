import { createTimestamp, mockProjectUsers, mockProjects } from '../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../utils/api-response';

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
			setResponseStatus(event, 404);

			return createApiErrorResponse('ASSIGNMENT_NOT_FOUND', 'Assignment not found');
		}

		const [deletedAssignment] = mockProjectUsers.splice(assignmentIndex, 1);
		const project = mockProjects.find((item) => item.id === projectId);

		if (project) {
			project.updated_at = createTimestamp();
		}

		return createApiSuccessResponse(deletedAssignment);
	});
});
