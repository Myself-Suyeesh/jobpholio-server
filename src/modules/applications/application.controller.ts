import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from './application.service.js';

export class ApplicationController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await ApplicationService.createApplication(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ApplicationService.listApplications(req.user!.id, req.query as any);
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await ApplicationService.getApplicationById(req.user!.id, id);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await ApplicationService.updateApplication(req.user!.id, id, req.body);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await ApplicationService.updateStatus(req.user!.id, id, req.body.status, req.body.note);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await ApplicationService.deleteApplication(req.user!.id, id);
      res.status(200).json({
        success: true,
        data: { message: 'Application deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const timeline = await ApplicationService.getTimeline(req.user!.id, id);
      res.status(200).json({
        success: true,
        data: { timeline },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Subdocument Controller Handlers: Notes ---

  public static async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await ApplicationService.addNote(req.user!.id, id, req.body);
      res.status(201).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const noteId = Array.isArray(req.params.noteId) ? req.params.noteId[0] : req.params.noteId;
      const application = await ApplicationService.updateNote(req.user!.id, id, noteId, req.body);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const noteId = Array.isArray(req.params.noteId) ? req.params.noteId[0] : req.params.noteId;
      const application = await ApplicationService.deleteNote(req.user!.id, id, noteId);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Subdocument Controller Handlers: Files ---

  public static async addFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await ApplicationService.addFile(req.user!.id, id, req.body);
      res.status(201).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
      const application = await ApplicationService.deleteFile(req.user!.id, id, fileId);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Subdocument Controller Handlers: Interviews ---

  public static async addInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const application = await ApplicationService.addInterview(req.user!.id, id, req.body);
      res.status(201).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const interviewId = Array.isArray(req.params.interviewId) ? req.params.interviewId[0] : req.params.interviewId;
      const application = await ApplicationService.updateInterview(req.user!.id, id, interviewId, req.body);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const interviewId = Array.isArray(req.params.interviewId) ? req.params.interviewId[0] : req.params.interviewId;
      const application = await ApplicationService.deleteInterview(req.user!.id, id, interviewId);
      res.status(200).json({
        success: true,
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }
}
