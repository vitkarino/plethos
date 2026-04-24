import { createTimestamp, mockProjectUsers, mockProjects, mockUsers } from '../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../utils/api-response';

export default defineEventHandler((event) => {
	return readBody<{
		project_id?: number | string;
		user_id?: number | string;
	}>(event).then((body) => {
		const projectId = Number(body.project_id);
		const userId = Number(body.user_id);
		const project = mockProjects.find((item) => item.id === projectId);
		const user = mockUsers.find((item) => item.id === userId);

		if (!project || !user) {
			setResponseStatus(event, 404);

			return createApiErrorResponse('PROJECT_OR_USER_NOT_FOUND', 'Project or user not found');
		}

		const existingAssignment = mockProjectUsers.find((item) => {
			return item.project_id === projectId && item.user_id === userId;
		});

		if (existingAssignment) {
			return createApiSuccessResponse(existingAssignment);
		}

		const assignedAt = createTimestamp();
		const assignment = {
			project_id: projectId,
			user_id: userId,
			assigned_at: assignedAt,
		};

		mockProjectUsers.push(assignment);
		project.updated_at = assignedAt;

		return createApiSuccessResponse(assignment);
	});
});
