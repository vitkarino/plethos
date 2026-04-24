import { createTimestamp, getNextId, mockProjects } from '../data/mock';

export default defineEventHandler((event) => {
	return readBody<{
		title?: string;
		description?: string;
	}>(event).then((body) => {
		const title = body.title?.trim();
		const description = body.description?.trim();

		if (!title || !description) {
			setResponseStatus(event, 400);

			return {
				$meta: {
					status: 'error',
					message: 'Invalid project data',
				},
				data: null,
			};
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

		return {
			$meta: {
				status: 'success',
			},
			data: project,
		};
	});
});
