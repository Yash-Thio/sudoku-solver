import tensorflow as tf
from keras import layers, models
import cv2
import numpy as np
from PIL import Image
import os


def convert_image_to_supported_format(input_path, output_path):
    try:
        img = Image.open(input_path)
        img.save(output_path)
        print(f"Image converted and saved at: {output_path}")
        return output_path
    except Exception as e:
        raise RuntimeError(f"Error converting image: {e}")

def preprocess_image(image_path):
    # Read image in grayscale mode
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Failed to load image")

    # Apply Gaussian blur
    blurred = cv2.GaussianBlur(img, (5, 5), 0)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    return thresh

def find_sudoku_grid(binary_img):
    # Ensure input is binary image
    if len(binary_img.shape) != 2:
        raise ValueError("Input must be a binary image")
    
    # Find contours in binary image
    contours, _ = cv2.findContours(
        binary_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    
    if not contours:
        raise ValueError("No contours found")
    
    # Find largest contour (assumed to be Sudoku grid)
    grid_contour = max(contours, key=cv2.contourArea)
    
    # Approximate the contour to get grid corners
    peri = cv2.arcLength(grid_contour, True)
    corners = cv2.approxPolyDP(grid_contour, 0.02 * peri, True)
    
    if len(corners) != 4:
        raise ValueError("Could not find 4 corners of Sudoku grid")
        
    return corners

def warp_perspective(img, corners):
    # Get dimensions for warped image
    width = height = 450  # Fixed size for output
    
    # Order points in [top-left, top-right, bottom-right, bottom-left]
    corners = corners.reshape(4, 2)
    ordered_corners = np.zeros((4, 2), dtype=np.float32)
    
    # Get ordered corners
    s = corners.sum(axis=1)
    ordered_corners[0] = corners[np.argmin(s)]  # Top-left
    ordered_corners[2] = corners[np.argmax(s)]  # Bottom-right
    
    diff = np.diff(corners, axis=1)
    ordered_corners[1] = corners[np.argmin(diff)]  # Top-right
    ordered_corners[3] = corners[np.argmax(diff)]  # Bottom-left
    
    # Calculate perspective transform
    dst_points = np.array([
        [0, 0], [width-1, 0],
        [width-1, height-1], [0, height-1]
    ], dtype=np.float32)
    
    matrix = cv2.getPerspectiveTransform(ordered_corners, dst_points)
    warped = cv2.warpPerspective(img, matrix, (width, height))
    
    return warped

def create_digit_recognition_model():
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(10, activation='softmax')
    ])
    return model


def predict_digit(image, model):
    # Preprocess image
    image = cv2.resize(image, (28, 28))
    image = image.astype('float32') / 255
    image = image.reshape(1, 28, 28, 1)
    
    # Make prediction
    prediction = model.predict(image)
    return np.argmax(prediction[0])

# Modify extract_digits function to use the CNN model
def extract_digits(img):
    # Load trained model
    model = models.load_model('sudoku_digit_model.h5')
    
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img

    grid = np.zeros((9, 9), dtype=np.int32)
    cell_width = img.shape[1] // 9
    cell_height = img.shape[0] // 9

    for i in range(9):
        for j in range(9):
            cell = gray[i*cell_height:(i+1)*cell_height, j*cell_width:(j+1)*cell_width]
            # Find contours in the cell
            contours, _ = cv2.findContours(cell, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest)
                digit_roi = cell[y:y+h, x:x+w]
                
                # Predict digit
                digit = predict_digit(digit_roi, model)
                if digit != 0:  # Ignore 0 predictions
                    grid[i][j] = digit
                    print(f"Found digit {digit} at ({i},{j})")

    return grid

def main():
    try:
        original_image_path = "/home/thio/projects/ml/sudoku.jpg"
        converted_image_path = "/home/thio/projects/ml/sudoku_converted.png"

        # Convert image if needed
        if not os.path.exists(converted_image_path):
            converted_image_path = convert_image_to_supported_format(
                original_image_path, converted_image_path
            )

        # Process image
        binary_image = preprocess_image(converted_image_path)
        grid_corners = find_sudoku_grid(binary_image)
        
        # Read original for warping
        color_image = cv2.imread(converted_image_path)
        warped = warp_perspective(color_image, grid_corners)
        
        # Visualization steps
        visualization = warped.copy()
        height, width = warped.shape[:2]
        cell_height = height // 9
        cell_width = width // 9
        
        # Draw grid lines
        for i in range(10):
            # Horizontal lines
            cv2.line(visualization, 
                    (0, i * cell_height), 
                    (width, i * cell_height),
                    (0, 255, 0), 2 if i % 3 == 0 else 1)
            
            # Vertical lines
            cv2.line(visualization, 
                    (i * cell_width, 0),
                    (i * cell_width, height),
                    (0, 255, 0), 2 if i % 3 == 0 else 1)
        
        # Save visualization
        cv2.imwrite("debug_grid_visualization.png", visualization)
        
        # Extract digits
        sudoku_array = extract_digits(warped)
        
        print("Extracted Sudoku Array:")
        for row in sudoku_array:
            print(row)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()