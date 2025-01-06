import { createClient } from "redis";
import Tesseract from "tesseract.js";
import { pubSub } from "../../services/store";
import { SudokuInput } from "../../shared/types";

const redisClient = createClient();

async function processSubmission(input: SudokuInput) {
  const submission = input.image;
  const userId = input.userId;
  try {
    const imageBuffer = Buffer.from(submission, "base64");

    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");

    const lines = text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 9); // Ensure we only take first 9 lines

    if (lines.length !== 9) {
      throw new Error("Could not detect a valid sudoku grid");
    }

    const sudoku: number[][] = lines.map((line) => {
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
    await redisClient.lPush("sudokuQueue", sudokuString);
    console.log("Sudoku puzzle added to queue:", sudokuString);
  } catch (error) {
    console.error("Error processing submission:", error);
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
      submission = await redisClient.brPop("imageQueue", 0);
      if (submission) {
        let sudoku = JSON.parse(submission.element);
        if (
          sudoku &&
          typeof sudoku.image === "string" &&
          typeof sudoku.userId === "string"
        ) {
          await processSubmission(sudoku);
        }
      }
    }
  } catch (error) {
    console.error("Failed to connect to Redis", error);
    if (submission) {
      await redisClient.lPush("imageQueue", submission.element);
    }
  }
}

startWorker();
