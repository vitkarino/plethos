import { mockProjects } from '../data/mock';
import { createApiSuccessResponse } from '../utils/api-response';

export default defineEventHandler(() => createApiSuccessResponse(mockProjects));
