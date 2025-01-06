import express from 'express';
import { Request, Response } from 'express';
import multer from 'multer';
import { createClient } from 'redis';
import { createServer } from 'http';
import { parse } from 'url';
import { wsManager } from './services/websocket';

const app = express();
app.use(express.json());
const port = 3000;

// Set up Redis client
const redisClient = createClient();
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const server = createServer(app);

server.on('upgrade', (request, socket, head) => {
  const { pathname, query } = parse(request.url || '', true);
  
  if (pathname === '/ws') {
    const userId = query.userId as string;
    if (!userId) {
      socket.destroy();
      return;
    }

    const wss = wsManager.getWSS();
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, userId);
    });
  } else {
    socket.destroy();
  }
});

app.post('/upload', upload.single('image'), async (req : Request, res : Response): Promise<void> => {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
      }
    
      try {
        if (req.file) {
          await redisClient.lPush('imageQueue', 
            JSON.stringify({
              image: req.file.buffer.toString('base64'),
              userId
            }));
          res.status(202).json({ message: 'Processing started' });
        } else {
          res.status(400).json({ error: 'No file uploaded' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
});


async function startServer() {
    try {
        await redisClient.connect();
        console.log("Connected to Redis");

        server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
            console.log(`WebSocket server is running on ws://localhost:${port}/ws`);
        });
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

startServer();