import { createClient } from "redis";
import { pubSub } from "../../services/store";
import { SudokuBoard } from "../../shared/types";

const redisClient = createClient();

function isValid(
  board: number[][],
  row: number,
  col: number,
  num: number
): boolean {
  for (let x = 0; x < 9; x++) {
    if (
      board[row][x] === num ||
      board[x][col] === num ||
      board[3 * Math.floor(row / 3) + Math.floor(x / 3)][
        3 * Math.floor(col / 3) + (x % 3)
      ] === num
    ) {
      return false;
    }
  }
  return true;
}

function solveSudoku(board: number[][]): boolean {
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

async function processSudoku(data: SudokuBoard) {
  const board = data.sudoku;
  const userId = data.userId;
  try {
    if (!Array.isArray(board) || board.length !== 9) {
      throw new Error("Invalid board structure");
    }

    if (solveSudoku(board)) {
      console.log("Solved Sudoku:", board);
      await pubSub.publishSolution(userId, board);
    } else {
      console.log("No solution exists for the given Sudoku.");
      await pubSub.publishSolution(userId, [], "No solution exists");
    }
  } catch (error) {
    console.error("Error processing sudoku:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await pubSub.publishSolution(userId, [], errorMessage);
  }
}

async function startWorker() {
  let submission;
  try {
    await redisClient.connect();
    console.log("Worker connected to Redis.");

    while (true) {
      submission = await redisClient.brPop("sudokuQueue", 0);
      if (submission) {
        let data = JSON.parse(submission.element);
        if (
          data &&
          Array.isArray(data.sudoku) &&
          data.sudoku.every((row: number[]) => Array.isArray(row)) &&
          typeof data.userId === "string"
        ) {
          await processSudoku(data);
        }
      }
    }
  } catch (error) {
    console.error("Failed to connect to Redis", error);
    if (submission) {
      await redisClient.lPush("sudokuQueue", submission.element);
    }
  }
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
