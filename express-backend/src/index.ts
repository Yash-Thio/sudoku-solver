import express from 'express';
import { Request, Response } from 'express';
import multer from 'multer';
import { createClient } from 'redis';

const app = express();
app.use(express.json());
const port = 3000;

// Set up Redis client
const redisClient = createClient();
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Set up multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.post('/upload', upload.single('image'), async (req : Request, res : Response): Promise<void> => {
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }

    try {
        // Add the image buffer to the Redis queue
        await redisClient.lPush('imageQueue', req.file.buffer.toString('base64'));
        res.status(200).send('Image uploaded and added to queue.');
    } catch (error) {
        console.error('Error adding image to Redis queue:', error);
        res.status(500).send('Internal Server Error');
    }
});


async function startServer() {
    try {
        await redisClient.connect();
        console.log("Connected to Redis");

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

startServer();