import { Router } from 'express';
import { ApplicationController } from './application.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  queryApplicationsSchema,
  addNoteSchema,
  updateNoteSchema,
  addFileSchema,
  addInterviewSchema,
  updateInterviewSchema,
} from './application.schema.js';

const applicationRouter = Router();

// Protect all application routes with authentication middleware
applicationRouter.use(requireAuth);

// Core CRUD Endpoints
applicationRouter.get('/', validateRequest(queryApplicationsSchema), ApplicationController.list);
applicationRouter.post('/', validateRequest(createApplicationSchema), ApplicationController.create);
applicationRouter.get('/:id', ApplicationController.getById);
applicationRouter.patch('/:id', validateRequest(updateApplicationSchema), ApplicationController.update);
applicationRouter.delete('/:id', ApplicationController.delete);

// Status Transition & Timeline Endpoints
applicationRouter.patch('/:id/status', validateRequest(updateStatusSchema), ApplicationController.updateStatus);
applicationRouter.get('/:id/timeline', ApplicationController.getTimeline);

// Notes Subdocuments Endpoints
applicationRouter.post('/:id/notes', validateRequest(addNoteSchema), ApplicationController.addNote);
applicationRouter.patch('/:id/notes/:noteId', validateRequest(updateNoteSchema), ApplicationController.updateNote);
applicationRouter.delete('/:id/notes/:noteId', ApplicationController.deleteNote);

// Files Subdocuments Endpoints
applicationRouter.post('/:id/files', validateRequest(addFileSchema), ApplicationController.addFile);
applicationRouter.delete('/:id/files/:fileId', ApplicationController.deleteFile);

// Interviews Subdocuments Endpoints
applicationRouter.post('/:id/interviews', validateRequest(addInterviewSchema), ApplicationController.addInterview);
applicationRouter.patch('/:id/interviews/:interviewId', validateRequest(updateInterviewSchema), ApplicationController.updateInterview);
applicationRouter.delete('/:id/interviews/:interviewId', ApplicationController.deleteInterview);

export default applicationRouter;
