import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface WavePaymentRequest {
  amount: number;
  currency: string;
  client_reference: string;
  success_url: string;
  error_url: string;
}

interface WavePaymentResponse {
  id: string;
  wave_launch_url: string;
}

class WaveService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = env.WAVE_API_URL || 'https://api.wave.com';
    this.apiKey = env.WAVE_API_KEY || '';
  }

  /**
   * Initiate a Wave payment
   */
  async initiatePayment(params: {
    amount: number;
    transactionId: string;
    currency?: string;
  }): Promise<{ checkoutId: string; checkoutUrl: string }> {
    try {
      const payload: WavePaymentRequest = {
        amount: params.amount,
        currency: params.currency || 'XOF',
        client_reference: params.transactionId,
        success_url: 'http://localhost:3000/payment/success',
        error_url: 'http://localhost:3000/payment/error',
      };

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
}

export const waveService = new WaveService();
