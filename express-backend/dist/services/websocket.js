"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsManager = exports.WebSocketManager = void 0;
const ws_1 = require("ws");
const store_1 = require("./store");
class WebSocketManager {
    constructor() {
        this.wss = new ws_1.WebSocketServer({ noServer: true });
        this.clients = new Map();
        this.wss.on('connection', (ws, userId) => {
            this.clients.set(userId, ws);
            store_1.pubSub.userSubscribe(userId, (data) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify(data));
                }
            });
            ws.on('close', () => {
                this.clients.delete(userId);
                store_1.pubSub.userUnSubscribe(userId);
            });
        });
    }
    static getInstance() {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }
    getWSS() {
        return this.wss;
    }
}
exports.WebSocketManager = WebSocketManager;
exports.wsManager = WebSocketManager.getInstance();
