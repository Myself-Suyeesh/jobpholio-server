import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const sessionsRouter = Router();

sessionsRouter.use(requireAuth);

sessionsRouter.get('/', AuthController.getSessions);
sessionsRouter.delete('/all', AuthController.revokeAllSessions);
sessionsRouter.delete('/:id', AuthController.revokeSession);

export default sessionsRouter;
