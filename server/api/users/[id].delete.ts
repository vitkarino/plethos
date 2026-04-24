import { mockProjectUsers, mockUsers } from '../../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../../utils/api-response';

export default defineEventHandler((event) => {
	const id = Number(getRouterParam(event, 'id'));
	const userIndex = mockUsers.findIndex((item) => item.id === id);

	if (userIndex === -1) {
		setResponseStatus(event, 404);

		return createApiErrorResponse('USER_NOT_FOUND', 'User not found');
	}

	const [deletedUser] = mockUsers.splice(userIndex, 1);

	for (let index = mockProjectUsers.length - 1; index >= 0; index -= 1) {
		if (mockProjectUsers[index].user_id === id) {
			mockProjectUsers.splice(index, 1);
		}
	}

	return createApiSuccessResponse(deletedUser);
});
