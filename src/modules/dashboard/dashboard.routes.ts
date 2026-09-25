import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/', DashboardController.getDashboard);

export default dashboardRouter;
