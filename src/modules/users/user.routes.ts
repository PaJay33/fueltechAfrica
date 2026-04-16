import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Attendant management routes
router.post('/attendants', (req, res) => userController.createAttendant(req, res));

router.get('/attendants/:stationId', (req, res) =>
  userController.getStationAttendants(req, res)
);

router.patch('/attendants/:id/pin', (req, res) =>
  userController.updateAttendantPin(req, res)
);

router.patch('/attendants/:id/toggle-status', (req, res) =>
  userController.toggleAttendantStatus(req, res)
);

export default router;
