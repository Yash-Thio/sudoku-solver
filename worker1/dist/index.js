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
const redis_1 = require("redis");
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const redisClient = (0, redis_1.createClient)();
function processSubmission(submission) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Decode the base64 image
            const imageBuffer = Buffer.from(submission, 'base64');
            // Use Tesseract.js to extract text from the image
            const { data: { text } } = yield tesseract_js_1.default.recognize(imageBuffer, 'eng');
            // Process the extracted text to form the Sudoku matrix
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            const sudoku = lines.map(line => {
                return line.split('').map(char => {
                    const num = parseInt(char, 10);
                    return isNaN(num) ? 0 : num;
                });
            });
            // Ensure the Sudoku matrix is 9x9
            if (sudoku.length !== 9 || sudoku.some(row => row.length !== 9)) {
                throw new Error('Invalid Sudoku matrix extracted from image');
            }
            // Push the Sudoku matrix to the Redis queue
            const sudokuString = JSON.stringify({ sudoku });
            yield redisClient.lPush('sudokuQueue', sudokuString);
            console.log('Sudoku puzzle added to queue:', sudokuString);
        }
        catch (error) {
            console.error('Error processing submission:', error);
        }
    });
}
function startWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        let submission;
        try {
            yield redisClient.connect();
            console.log("Worker connected to Redis.");
            while (true) {
                submission = yield redisClient.brPop("imageQueue", 0);
                if (submission) {
                    yield processSubmission(submission.element);
                }
            }
        }
        catch (error) {
            console.error("Failed to connect to Redis", error);
            if (submission) {
                yield redisClient.lPush("imageQueue", submission.element);
            }
        }
    });
}
startWorker();
