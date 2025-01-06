import { WebSocket, WebSocketServer } from 'ws';
import { pubSub } from './store';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket>;

  private constructor() {
    this.wss = new WebSocketServer({ noServer: true });
    this.clients = new Map();

    this.wss.on('connection', (ws: WebSocket, userId: string) => {
      this.clients.set(userId, ws);
      
      pubSub.userSubscribe(userId, (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      });

      ws.on('close', () => {
        this.clients.delete(userId);
        pubSub.userUnSubscribe(userId);
      });
    });
  }

  static getInstance() {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public getWSS() {
    return this.wss;
  }
}

export const wsManager = WebSocketManager.getInstance();
