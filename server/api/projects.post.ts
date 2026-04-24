import { createTimestamp, getNextId, mockProjects } from '../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../utils/api-response';

export default defineEventHandler((event) => {
	return readBody<{
		title?: string;
		description?: string;
	}>(event).then((body) => {
		const title = body.title?.trim();
		const description = body.description?.trim();

		if (!title || !description) {
			setResponseStatus(event, 400);

			return createApiErrorResponse('INVALID_PROJECT_DATA', 'Invalid project data');
		}

		const createdAt = createTimestamp();
		const project = {
			id: getNextId(mockProjects),
			title,
			description,
			created_at: createdAt,
			updated_at: createdAt,
		};

		mockProjects.push(project);

		return createApiSuccessResponse(project);
	});
});
