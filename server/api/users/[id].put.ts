import { createTimestamp, mockUsers } from '../../data/mock';

export default defineEventHandler((event) => {
	const id = Number(getRouterParam(event, 'id'));
	const user = mockUsers.find((item) => item.id === id);

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: 'User not found',
		});
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
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid user data',
			});
		}

		user.name = name;
		user.age = age;
		user.sex = sex;
		user.updated_at = createTimestamp();

		return user;
	});
});
