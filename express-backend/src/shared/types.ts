export interface SudokuBoard {
  userId: string;
  sudoku: number[][];
}

export interface PubSubMessage {
  userId: string;
  solution?: number[][];
  error?: string;
}

export interface SudokuInput {
  userId: string;
  image: string;
}

export interface WSResponse {
  solution?: number[][];
  error?: string;
}