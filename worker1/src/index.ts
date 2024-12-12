import { createClient } from "redis";
import Tesseract from "tesseract.js";

const redisClient = createClient();

async function processSubmission(submission: string) {
  try {
    // Decode the base64 image
    const imageBuffer = Buffer.from(submission, "base64");

    // Use Tesseract.js to extract text from the image
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");

    // Process the extracted text to form the Sudoku matrix
    const lines = text.split("\n").filter((line) => line.trim().length > 0);
    const sudoku: number[][] = lines.map((line) => {
      return line.split("").map((char) => {
        const num = parseInt(char, 10);
        return isNaN(num) ? 0 : num;
      });
    });

    // Ensure the Sudoku matrix is 9x9
    if (sudoku.length !== 9 || sudoku.some((row) => row.length !== 9)) {
      throw new Error("Invalid Sudoku matrix extracted from image");
    }

    // Push the Sudoku matrix to the Redis queue
    const sudokuString = JSON.stringify({ sudoku });
    await redisClient.lPush("sudokuQueue", sudokuString);
    console.log("Sudoku puzzle added to queue:", sudokuString);
  } catch (error) {
    console.error("Error processing submission:", error);
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
        await processSubmission(submission.element);
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
