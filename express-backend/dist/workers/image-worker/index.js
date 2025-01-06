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
const store_1 = require("../../services/store");
const redisClient = (0, redis_1.createClient)();
function processSubmission(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const submission = input.image;
        const userId = input.userId;
        try {
            const imageBuffer = Buffer.from(submission, "base64");
            const { data: { text }, } = yield tesseract_js_1.default.recognize(imageBuffer, "eng");
            const lines = text
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .slice(0, 9); // Ensure we only take first 9 lines
            if (lines.length !== 9) {
                throw new Error("Could not detect a valid sudoku grid");
            }
            const sudoku = lines.map((line) => {
                const numbers = line
                    .replace(/[^0-9]/g, "0")
                    .slice(0, 9)
                    .split("")
                    .map(Number);
                if (numbers.length !== 9) {
                    throw new Error("Invalid row length in sudoku grid");
                }
                return numbers;
            });
            const sudokuString = JSON.stringify({
                sudoku,
                userId,
            });
            yield redisClient.lPush("sudokuQueue", sudokuString);
            console.log("Sudoku puzzle added to queue:", sudokuString);
        }
        catch (error) {
            console.error("Error processing submission:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            yield store_1.pubSub.publishSolution(userId, [], errorMessage);
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
                    let sudoku = JSON.parse(submission.element);
                    if (sudoku &&
                        typeof sudoku.image === "string" &&
                        typeof sudoku.userId === "string") {
                        yield processSubmission(sudoku);
                    }
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
