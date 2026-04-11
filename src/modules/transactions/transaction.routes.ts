import { Router } from 'express';
import { transactionController } from './transaction.controller';
import { authenticate, authorize } from '../../middleware/authenticate';

const router = Router();

/**
 * @route   POST /api/v1/transactions
 * @desc    Initiate a new transaction
 * @access  Private (all authenticated users)
 */
router.post(
  '/',
  authenticate,
  authorize('OWNER', 'MANAGER', 'ATTENDANT', 'CUSTOMER'),
  (req, res) => transactionController.initiateTransaction(req, res)
);

/**
 * @route   GET /api/v1/transactions
 * @desc    Get all transactions with filters
 * @access  Private (all authenticated users)
 */
router.get(
  '/',
  authenticate,
  (req, res) => transactionController.getTransactions(req, res)
);

/**
 * @route   GET /api/v1/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private (all authenticated users)
 */
router.get(
  '/:id',
  authenticate,
  (req, res) => transactionController.getTransactionById(req, res)
);

/**
 * @route   DELETE /api/v1/transactions/:id
 * @desc    Cancel a transaction
 * @access  Private (all authenticated users)
 */
router.delete(
  '/:id',
  authenticate,
  (req, res) => transactionController.cancelTransaction(req, res)
);

/**
 * @route   POST /api/v1/transactions/webhook/wave
 * @desc    Wave payment webhook
 * @access  Public (no authentication)
 */
router.post(
  '/webhook/wave',
  (req, res) => transactionController.waveWebhook(req, res)
);

export default router;
