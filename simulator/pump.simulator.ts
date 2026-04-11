import { EventEmitter } from 'events';
import { logger } from '../src/utils/logger';

interface FuelDataEvent {
  transactionId: string;
  volumeDelivered: number;
  flowRate: number;
  timestamp: Date;
}

interface FuelingCompleteEvent {
  transactionId: string;
  volumeDelivered: number;
  finalAmount: number;
}

interface ActiveFueling {
  transactionId: string;
  maxAmount: number;
  pricePerLiter: number;
  volumeDelivered: number;
  interval: NodeJS.Timeout;
}

class PumpSimulator extends EventEmitter {
  private activeFuelings: Map<string, ActiveFueling> = new Map();
  private readonly FLOW_RATE = 0.5; // litres per 500ms
  private readonly TICK_INTERVAL = 500; // ms

  /**
   * Authorize a transaction and start fueling after 2 seconds
   */
  async authorize(
    transactionId: string,
    nozzleId: string,
    maxAmount: number,
    pricePerLiter: number
  ): Promise<void> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      logger.info(`Pump authorized for transaction ${transactionId}`, {
        nozzleId,
        maxAmount,
        pricePerLiter,
      });

      // Wait 2 seconds before starting fueling
      setTimeout(() => {
        this.simulateFueling(transactionId, maxAmount, pricePerLiter);
      }, 2000);
    } catch (error) {
      logger.error(`Error authorizing pump for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Simulate the fueling process
   */
  private simulateFueling(
    transactionId: string,
    maxAmount: number,
    pricePerLiter: number
  ): void {
    let volumeDelivered = 0;

    logger.info(`Starting fueling for transaction ${transactionId}`);

    const interval = setInterval(() => {
      // Add fuel at flow rate
      volumeDelivered += this.FLOW_RATE;
      const currentAmount = volumeDelivered * pricePerLiter;

      // Emit fuel data event
      const fuelData: FuelDataEvent = {
        transactionId,
        volumeDelivered: Math.round(volumeDelivered * 100) / 100,
        flowRate: this.FLOW_RATE,
        timestamp: new Date(),
      };
      this.emit('fuel_data', fuelData);

      // Check if we've reached the max amount
      if (currentAmount >= maxAmount) {
        clearInterval(interval);
        this.activeFuelings.delete(transactionId);

        const finalAmount = Math.round(volumeDelivered * pricePerLiter);

        logger.info(`Fueling complete for transaction ${transactionId}`, {
          volumeDelivered: Math.round(volumeDelivered * 100) / 100,
          finalAmount,
        });

        // Emit completion event
        const completeData: FuelingCompleteEvent = {
          transactionId,
          volumeDelivered: Math.round(volumeDelivered * 100) / 100,
          finalAmount,
        };
        this.emit('fueling_complete', completeData);
      }
    }, this.TICK_INTERVAL);

    // Store active fueling
    this.activeFuelings.set(transactionId, {
      transactionId,
      maxAmount,
      pricePerLiter,
      volumeDelivered,
      interval,
    });
  }

  /**
   * Stop fueling for a transaction
   */
  stop(transactionId: string): void {
    const activeFueling = this.activeFuelings.get(transactionId);

    if (activeFueling) {
      clearInterval(activeFueling.interval);
      this.activeFuelings.delete(transactionId);

      logger.info(`Stopped fueling for transaction ${transactionId}`, {
        volumeDelivered: activeFueling.volumeDelivered,
      });

      // Emit completion event with current volume
      const completeData: FuelingCompleteEvent = {
        transactionId,
        volumeDelivered: Math.round(activeFueling.volumeDelivered * 100) / 100,
        finalAmount: Math.round(activeFueling.volumeDelivered * activeFueling.pricePerLiter),
      };
      this.emit('fueling_complete', completeData);
    }
  }
}

// Export singleton instance
export const pumpSimulator = new PumpSimulator();
