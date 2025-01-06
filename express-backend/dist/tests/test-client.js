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
const ws_1 = __importDefault(require("ws"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const path_1 = require("path");
const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';
function testSudokuSolver() {
    return __awaiter(this, void 0, void 0, function* () {
        const userId = `test-${Date.now()}`;
        // 1. Connect to WebSocket
        const ws = new ws_1.default(`${WS_URL}?userId=${userId}`);
        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            console.log('Received solution:', response);
            if (response.solution || response.error) {
                ws.close();
                process.exit(0);
            }
        });
        ws.on('open', () => __awaiter(this, void 0, void 0, function* () {
            try {
                // 2. Upload test image
                const imagePath = (0, path_1.join)(__dirname, 'test-sudoku.jpg');
                const imageBuffer = (0, fs_1.readFileSync)(imagePath);
                const formData = new FormData();
                formData.append('image', new Blob([imageBuffer]));
                const response = yield axios_1.default.post(`${API_URL}/upload`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'x-user-id': userId
                    }
                });
                console.log('Upload response:', response.data);
            }
            catch (error) {
                console.error('Error uploading image:', error);
                ws.close();
                process.exit(1);
            }
        }));
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            process.exit(1);
        });
    });
}
testSudokuSolver();
