import axios from 'axios';
import crypto from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface WavePaymentRequest {
  amount: string;
  currency: string;
  client_reference: string;
  success_url: string;
  error_url: string;
  webhook_url: string;
  customer_phone?: string;
}

interface WavePaymentResponse {
  id: string;
  wave_launch_url: string;
  client_reference: string;
}

interface WaveWebhookPayload {
  id: string;
  client_reference: string;
  payment_status: string;
  amount: string;
  currency: string;
  [key: string]: any;
}

class WaveService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly appUrl: string;

  constructor() {
    this.apiUrl = env.WAVE_API_URL || 'https://api.wave.com';
    this.apiKey = env.WAVE_API_KEY || '';
    this.webhookSecret = env.WAVE_WEBHOOK_SECRET || '';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Check if we should use mock for development
   */
  private shouldUseMock(): boolean {
    return (
      env.NODE_ENV === 'development' &&
      (this.apiKey.includes('your-wave') || this.apiKey === '')
    );
  }

  /**
   * Initiate a Wave payment
   */
  async initiatePayment(params: {
    amount: number;
    transactionId: string;
    currency?: string;
    customerPhone?: string;
  }): Promise<{ checkoutId: string; checkoutUrl: string }> {
    try {
      // Use mock in development with default API key
      if (this.shouldUseMock()) {
        logger.info('Using Wave payment mock for development');
        return {
          checkoutId: `mock_checkout_${params.transactionId}`,
          checkoutUrl: `${this.appUrl}/payment/mock?ref=${params.transactionId}`,
        };
      }

      const payload: WavePaymentRequest = {
        amount: params.amount.toString(),
        currency: params.currency || 'XOF',
        client_reference: params.transactionId,
        success_url: `${this.appUrl}/payment/success`,
        error_url: `${this.appUrl}/payment/error`,
        webhook_url: `${this.appUrl}/api/v1/transactions/webhook/wave`,
      };

      if (params.customerPhone) {
        payload.customer_phone = params.customerPhone;
      }

      logger.info('Initiating Wave payment:', payload);

      const response = await axios.post<WavePaymentResponse>(
        `${this.apiUrl}/v1/checkout/sessions`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Wave payment initiated successfully:', {
        checkoutId: response.data.id,
      });

      return {
        checkoutId: response.data.id,
        checkoutUrl: response.data.wave_launch_url,
      };
    } catch (error: any) {
      logger.error('Error initiating Wave payment:', {
        message: error.message,
        response: error.response?.data,
      });
      throw new Error('WAVE_PAYMENT_FAILED');
    }
  }

  /**
   * Verify a Wave payment status
   */
  async verifyPayment(checkoutId: string): Promise<string> {
    try {
      // Mock verification in development
      if (this.shouldUseMock()) {
        return 'succeeded';
      }

      const response = await axios.get(
        `${this.apiUrl}/v1/checkout/sessions/${checkoutId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data.status;
    } catch (error: any) {
      logger.error('Error verifying Wave payment:', {
        checkoutId,
        message: error.message,
      });
      throw new Error('WAVE_VERIFICATION_FAILED');
    }
  }

  /**
   * Handle Wave webhook and verify signature
   */
  handleWebhook(
    payload: WaveWebhookPayload,
    signature?: string
  ): { transactionId: string; status: 'succeeded' | 'failed' } {
    try {
      // Verify signature if webhook secret is configured
      if (this.webhookSecret && signature && !this.shouldUseMock()) {
        const isValid = this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Extract transaction ID and status
      const transactionId = payload.client_reference;
      const paymentStatus = payload.payment_status.toLowerCase();

      let status: 'succeeded' | 'failed';
      if (paymentStatus === 'succeeded' || paymentStatus === 'completed') {
        status = 'succeeded';
      } else {
        status = 'failed';
      }

      logger.info('Wave webhook processed:', {
        transactionId,
        status,
        paymentStatus: payload.payment_status,
      });

      return { transactionId, status };
    } catch (error) {
      logger.error('Error handling Wave webhook:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const expectedSignature = hmac.update(payloadString).digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

export const waveService = new WaveService();
