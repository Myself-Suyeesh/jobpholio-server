import { Router } from 'express';
import { ProfileController } from './profile.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { updateProfileSchema } from './profile.schema.js';

const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/completion', ProfileController.getCompletion);
profileRouter.get('/', ProfileController.getProfile);
profileRouter.patch('/', validateRequest(updateProfileSchema), ProfileController.updateProfile);

export default profileRouter;
