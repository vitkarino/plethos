import { createTimestamp, mockUsers } from '../../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../../utils/api-response';

export default defineEventHandler((event) => {
	const id = Number(getRouterParam(event, 'id'));
	const user = mockUsers.find((item) => item.id === id);

	if (!user) {
		setResponseStatus(event, 404);

		return createApiErrorResponse('USER_NOT_FOUND', 'User not found');
	}

	return readBody<{
		name?: string;
		age?: number | string;
		sex?: string;
	}>(event).then((body) => {
		const name = body.name?.trim();
		const age = Number(body.age);
		const sex = body.sex;

		if (!name || !Number.isFinite(age) || age < 0 || (sex !== 'male' && sex !== 'female')) {
			setResponseStatus(event, 400);

			return createApiErrorResponse('INVALID_USER_DATA', 'Invalid user data');
		}

		user.name = name;
		user.age = age;
		user.sex = sex;
		user.updated_at = createTimestamp();

		return createApiSuccessResponse(user);
	});
});
