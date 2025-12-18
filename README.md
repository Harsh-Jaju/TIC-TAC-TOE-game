# Neon Tic-Tac-Toe

A modern, glassmorphism-styled Tic-Tac-Toe game with a C++ backend.

## Requirements
- A C++ Compiler (MinGW/G++ or MSVC).

## How to Run

1. **Compile the Server**:
   Open a terminal in this directory and run:
   ```bash
   g++ -o server.exe server.cpp -lws2_32
   ```

2. **Start the Server**:
   ```bash
   .\server.exe
   ```
   You should see: `Server running on http://localhost:8080`

3. **Play**:
   Open your web browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

## Features
- **Frontend**: HTML5, Modern CSS3 (Glassmorphism, Animations), JavaScript.
- **Backend**: C++ (Custom HTTP Server with Minimax AI).
- **AI**: Unbeatable Minimax algorithm.