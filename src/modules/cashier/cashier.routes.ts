import { Router } from 'express';
import { cashierController } from './cashier.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Public routes
router.post('/login-pin', (req, res) => cashierController.loginWithPin(req, res));
router.get('/station/:stationId/summary', (req, res) =>
  cashierController.getSessionSummary(req, res)
);

// Protected routes - require JWT
router.post('/close-session', authenticate, (req, res) =>
  cashierController.closeSession(req, res)
);

router.get('/session/active', authenticate, (req, res) =>
  cashierController.getActiveSession(req, res)
);

router.get('/session/:id/report', authenticate, (req, res) =>
  cashierController.getSessionReport(req, res)
);

export default router;
