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
const redis_1 = require("redis");
const store_1 = require("../../services/store");
const redisClient = (0, redis_1.createClient)();
function isValid(board, row, col, num) {
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num ||
            board[x][col] === num ||
            board[3 * Math.floor(row / 3) + Math.floor(x / 3)][3 * Math.floor(col / 3) + (x % 3)] === num) {
            return false;
        }
    }
    return true;
}
function solveSudoku(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solveSudoku(board)) {
                            return true;
                        }
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}
function processSudoku(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const board = data.sudoku;
        const userId = data.userId;
        try {
            if (!Array.isArray(board) || board.length !== 9) {
                throw new Error("Invalid board structure");
            }
            if (solveSudoku(board)) {
                console.log("Solved Sudoku:", board);
                yield store_1.pubSub.publishSolution(userId, board);
            }
            else {
                console.log("No solution exists for the given Sudoku.");
                yield store_1.pubSub.publishSolution(userId, [], "No solution exists");
            }
        }
        catch (error) {
            console.error("Error processing sudoku:", error);
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
                submission = yield redisClient.brPop("sudokuQueue", 0);
                if (submission) {
                    let data = JSON.parse(submission.element);
                    if (data &&
                        Array.isArray(data.sudoku) &&
                        data.sudoku.every((row) => Array.isArray(row)) &&
                        typeof data.userId === "string") {
                        yield processSudoku(data);
                    }
                }
            }
        }
        catch (error) {
            console.error("Failed to connect to Redis", error);
            if (submission) {
                yield redisClient.lPush("sudokuQueue", submission.element);
            }
        }
    });
}
startWorker();
// sample input structure
// processSudoku(`{
//   "sudoku": [
//     [5, 3, 0, 0, 7, 0, 0, 0, 0],
//     [6, 0, 0, 1, 9, 5, 0, 0, 0],
//     [0, 9, 8, 0, 0, 0, 0, 6, 0],
//     [8, 0, 0, 0, 6, 0, 0, 0, 3],
//     [4, 0, 0, 8, 0, 3, 0, 0, 1],
//     [7, 0, 0, 0, 2, 0, 0, 0, 6],
//     [0, 6, 0, 0, 0, 0, 2, 8, 0],
//     [0, 0, 0, 4, 1, 9, 0, 0, 5],
//     [0, 0, 0, 0, 8, 0, 0, 7, 9]
//   ],
//   "userId": "user123"
// }`)
