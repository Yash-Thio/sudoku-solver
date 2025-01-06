"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubSub = exports.PubSubManager = void 0;
const redis_1 = require("redis");
class PubSubManager {
    constructor() {
        // Publisher client
        this.redisClient = (0, redis_1.createClient)();
        // Subscriber client
        this.subscribeClient = (0, redis_1.createClient)();
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
    userSubscribe(userId, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.subscribers.set(userId, callback);
        });
    }
    userUnSubscribe(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.subscribers.delete(userId);
        });
    }
    handleMessage(message) {
        try {
            const data = JSON.parse(message);
            const callback = this.subscribers.get(data.userId);
            if (callback) {
                if (data.error) {
                    callback({ error: data.error });
                }
                else {
                    callback({ solution: data.solution });
                }
            }
        }
        catch (error) {
            console.error('Error handling message:', error);
        }
    }
    publishSolution(userId, solution, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = {
                userId,
                solution,
                error
            };
            yield this.redisClient.publish('sudoku-solutions', JSON.stringify(message));
        });
    }
}
exports.PubSubManager = PubSubManager;
exports.pubSub = PubSubManager.getInstance();
