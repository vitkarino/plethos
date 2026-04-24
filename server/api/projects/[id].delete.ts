import { mockProjectUsers, mockProjects } from '../../data/mock';

export default defineEventHandler((event) => {
	const id = Number(getRouterParam(event, 'id'));
	const projectIndex = mockProjects.findIndex((item) => item.id === id);

	if (projectIndex === -1) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Project not found',
		});
	}

	const [deletedProject] = mockProjects.splice(projectIndex, 1);

	for (let index = mockProjectUsers.length - 1; index >= 0; index -= 1) {
		if (mockProjectUsers[index].project_id === id) {
			mockProjectUsers.splice(index, 1);
		}
	}

	return deletedProject;
});
