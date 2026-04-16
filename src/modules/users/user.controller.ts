import { Request, Response } from 'express';
import { userService } from './user.service';
import { ApiResponse } from '../../utils/apiResponse';
import { logger } from '../../utils/logger';
import { z } from 'zod';

// Validation schemas
const createAttendantSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  stationId: z.string().cuid(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

const updatePinSchema = z.object({
  newPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

class UserController {
  /**
   * Create attendant
   * POST /api/v1/users/attendants
   */
  async createAttendant(req: Request, res: Response): Promise<void> {
    try {
      const dto = createAttendantSchema.parse(req.body);
      const ownerId = req.user!.id;
      const userRole = req.user!.role;

      // Only owners can create attendants
      if (userRole !== 'OWNER') {
        ApiResponse.forbidden(res, 'Only owners can create attendants');
        return;
      }

      const attendant = await userService.createAttendant(ownerId, dto);

      ApiResponse.created(res, attendant, 'Attendant created successfully');
    } catch (error: any) {
      logger.error('Error in create attendant:', error);

      if (error.message === 'Station not found or you do not own this station') {
        ApiResponse.forbidden(res, error.message);
        return;
      }

      if (error.message === 'Email already in use') {
        ApiResponse.badRequest(res, error.message);
        return;
      }

      if (error.message === 'PIN must be exactly 4 digits') {
        ApiResponse.badRequest(res, error.message);
        return;
      }

      ApiResponse.error(res, 'Failed to create attendant', 500, error);
    }
  }

  /**
   * Get station attendants
   * GET /api/v1/users/attendants/:stationId
   */
  async getStationAttendants(req: Request, res: Response): Promise<void> {
    try {
      const { stationId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (!stationId) {
        ApiResponse.badRequest(res, 'Station ID is required');
        return;
      }

      const attendants = await userService.getStationAttendants(stationId, userId, userRole);

      ApiResponse.success(res, attendants, 'Attendants retrieved successfully');
    } catch (error: any) {
      logger.error('Error in get station attendants:', error);

      if (error.message === 'You do not have access to this station') {
        ApiResponse.forbidden(res, error.message);
        return;
      }

      ApiResponse.error(res, 'Failed to retrieve attendants', 500, error);
    }
  }

  /**
   * Update attendant PIN
   * PATCH /api/v1/users/attendants/:id/pin
   */
  async updateAttendantPin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPin } = updatePinSchema.parse(req.body);
      const ownerId = req.user!.id;
      const userRole = req.user!.role;

      if (!id) {
        ApiResponse.badRequest(res, 'Attendant ID is required');
        return;
      }

      // Only owners can update PINs
      if (userRole !== 'OWNER') {
        ApiResponse.forbidden(res, 'Only owners can update attendant PINs');
        return;
      }

      const result = await userService.updateAttendantPin(id, newPin, ownerId);

      ApiResponse.success(res, result, 'PIN updated successfully');
    } catch (error: any) {
      logger.error('Error in update attendant PIN:', error);

      if (
        error.message === 'Attendant not found' ||
        error.message === 'User is not an attendant' ||
        error.message === 'Attendant not assigned to any station'
      ) {
        ApiResponse.notFound(res, error.message);
        return;
      }

      if (error.message === 'You do not have permission to update this attendant') {
        ApiResponse.forbidden(res, error.message);
        return;
      }

      if (error.message === 'PIN must be exactly 4 digits') {
        ApiResponse.badRequest(res, error.message);
        return;
      }

      ApiResponse.error(res, 'Failed to update PIN', 500, error);
    }
  }

  /**
   * Toggle attendant status
   * PATCH /api/v1/users/attendants/:id/toggle-status
   */
  async toggleAttendantStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ownerId = req.user!.id;
      const userRole = req.user!.role;

      if (!id) {
        ApiResponse.badRequest(res, 'Attendant ID is required');
        return;
      }

      // Only owners can toggle status
      if (userRole !== 'OWNER') {
        ApiResponse.forbidden(res, 'Only owners can toggle attendant status');
        return;
      }

      const result = await userService.toggleAttendantStatus(id, ownerId);

      ApiResponse.success(res, result, 'Attendant status updated successfully');
    } catch (error: any) {
      logger.error('Error in toggle attendant status:', error);

      if (
        error.message === 'Attendant not found' ||
        error.message === 'User is not an attendant'
      ) {
        ApiResponse.notFound(res, error.message);
        return;
      }

      if (error.message === 'You do not have permission to modify this attendant') {
        ApiResponse.forbidden(res, error.message);
        return;
      }

      ApiResponse.error(res, 'Failed to toggle attendant status', 500, error);
    }
  }
}

export const userController = new UserController();
