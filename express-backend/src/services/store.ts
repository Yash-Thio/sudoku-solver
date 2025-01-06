import { createClient, RedisClientType } from "redis";
import { PubSubMessage } from "../shared/types";

export class PubSubManager {
  private static instance: PubSubManager;
  private redisClient: RedisClientType;
  private subscribeClient: RedisClientType;
  private subscribers: Map<string, Function>;

  private constructor() {
    // Publisher client
    this.redisClient = createClient();
    // Subscriber client
    this.subscribeClient = createClient();
    this.subscribers = new Map();

    this.redisClient.connect();
    this.subscribeClient.connect().then(() => {
      this.subscribeClient.subscribe('sudoku-solutions', (message) => {
        this.handleMessage(message);
      });
    });
  }

  static getInstance() {
    if (PubSubManager.instance) {
      return PubSubManager.instance;
    }
    PubSubManager.instance = new PubSubManager();
    return PubSubManager.instance;
  }

  public async userSubscribe(userId: string, callback: (solution: number[][] | string) => void) {
    this.subscribers.set(userId, callback);
  }

  public async userUnSubscribe(userId: string) {
    this.subscribers.delete(userId);
  }

  private handleMessage(message: string) {
    try {
      const data: PubSubMessage = JSON.parse(message);
      const callback = this.subscribers.get(data.userId);
      if (callback) {
        if (data.error) {
          callback({ error: data.error });
        } else {
          callback({ solution: data.solution });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  public async publishSolution(userId: string, solution: number[][], error?: string) {
    const message: PubSubMessage = {
      userId,
      solution,
      error
    };
    await this.redisClient.publish('sudoku-solutions', JSON.stringify(message));
  }
}

export const pubSub = PubSubManager.getInstance();