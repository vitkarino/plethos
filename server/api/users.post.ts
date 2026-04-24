import { createTimestamp, getNextId, mockUsers } from '../data/mock';
import { createApiErrorResponse, createApiSuccessResponse } from '../utils/api-response';

export default defineEventHandler((event) => {
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

		const createdAt = createTimestamp();
		const user = {
			id: getNextId(mockUsers),
			name,
			age,
			sex,
			created_at: createdAt,
			updated_at: createdAt,
		};

		mockUsers.push(user);

		return createApiSuccessResponse(user);
	});
});
