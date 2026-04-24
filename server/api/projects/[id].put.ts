import { createTimestamp, mockProjects } from '../../data/mock';

export default defineEventHandler((event) => {
	const id = Number(getRouterParam(event, 'id'));
	const project = mockProjects.find((item) => item.id === id);

	if (!project) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Project not found',
		});
	}

	return readBody<{
		title?: string;
		description?: string;
	}>(event).then((body) => {
		const title = body.title?.trim();
		const description = body.description?.trim();

		if (!title || !description) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid project data',
			});
		}

		project.title = title;
		project.description = description;
		project.updated_at = createTimestamp();

		return project;
	});
});
