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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const redis_1 = require("redis");
const http_1 = require("http");
const url_1 = require("url");
const websocket_1 = require("./services/websocket");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = 3000;
// Set up Redis client
const redisClient = (0, redis_1.createClient)();
redisClient.on('error', (err) => console.error('Redis Client Error', err));
// Set up multer for handling file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage: storage });
const server = (0, http_1.createServer)(app);
server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = (0, url_1.parse)(request.url || '', true);
    if (pathname === '/ws') {
        const userId = query.userId;
        if (!userId) {
            socket.destroy();
            return;
        }
        const wss = websocket_1.wsManager.getWSS();
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, userId);
        });
    }
    else {
        socket.destroy();
    }
});
app.post('/upload', upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        res.status(400).json({ error: 'User ID required' });
    }
    try {
        if (req.file) {
            yield redisClient.lPush('imageQueue', JSON.stringify({
                image: req.file.buffer.toString('base64'),
                userId
            }));
            res.status(202).json({ message: 'Processing started' });
        }
        else {
            res.status(400).json({ error: 'No file uploaded' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisClient.connect();
            console.log("Connected to Redis");
            server.listen(port, () => {
                console.log(`Server is running on http://localhost:${port}`);
                console.log(`WebSocket server is running on ws://localhost:${port}/ws`);
            });
        }
        catch (error) {
            console.error("Failed to connect to Redis", error);
        }
    });
}
startServer();
