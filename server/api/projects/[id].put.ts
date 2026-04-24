import { createTimestamp, mockProjects } from '../../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../../utils/api-response';

export default defineEventHandler((event) => {
	const id = Number(getRouterParam(event, 'id'));
	const project = mockProjects.find((item) => item.id === id);

	if (!project) {
		setResponseStatus(event, 404);

		return createApiErrorResponse('PROJECT_NOT_FOUND', 'Project not found');
	}

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

		project.title = title;
		project.description = description;
		project.updated_at = createTimestamp();

		return createApiSuccessResponse(project);
	});
});
