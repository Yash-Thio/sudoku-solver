import WebSocket from 'ws';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

async function testSudokuSolver() {
    const userId = `test-${Date.now()}`;
    
    // 1. Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}?userId=${userId}`);
    
    ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        console.log('Received solution:', response);
        if (response.solution || response.error) {
            ws.close();
            process.exit(0);
        }
    });

    ws.on('open', async () => {
        try {
            // 2. Upload test image
            const imagePath = join(__dirname, 'test-sudoku.jpg');
            const imageBuffer = readFileSync(imagePath);
            
            const formData = new FormData();
            formData.append('image', new Blob([imageBuffer]));
            
            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-user-id': userId
                }
            });
            
            console.log('Upload response:', response.data);
        } catch (error) {
            console.error('Error uploading image:', error);
            ws.close();
            process.exit(1);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        process.exit(1);
    });
}

testSudokuSolver();
