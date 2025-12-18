#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <thread>
#include <algorithm>

// Link with Ws2_32.lib
#pragma comment(lib, "Ws2_32.lib")

#define PORT 8080
#define BUFFER_SIZE 4096

// Game Logic
char checkWinner(const std::vector<std::string>& board) {
    const int winPatterns[8][3] = {
        {0, 1, 2}, {3, 4, 5}, {6, 7, 8},
        {0, 3, 6}, {1, 4, 7}, {2, 5, 8},
        {0, 4, 8}, {2, 4, 6}
    };

    for (auto& pattern : winPatterns) {
        if (board[pattern[0]] != "" &&
            board[pattern[0]] == board[pattern[1]] &&
            board[pattern[0]] == board[pattern[2]]) {
            return board[pattern[0]][0];
        }
    }
    return 0;
}

bool isBoardFull(const std::vector<std::string>& board) {
    for (const auto& cell : board) {
        if (cell == "") return false;
    }
    return true;
}

int minimax(std::vector<std::string>& board, int depth, bool isMaximizing) {
    char result = checkWinner(board);
    if (result == 'O') return 10 - depth;
    if (result == 'X') return depth - 10;
    if (isBoardFull(board)) return 0;

    if (isMaximizing) {
        int bestScore = -1000;
        for (int i = 0; i < 9; i++) {
            if (board[i] == "") {
                board[i] = "O";
                int score = minimax(board, depth + 1, false);
                board[i] = "";
                bestScore = std::max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        int bestScore = 1000;
        for (int i = 0; i < 9; i++) {
            if (board[i] == "") {
                board[i] = "X";
                int score = minimax(board, depth + 1, true);
                board[i] = "";
                bestScore = std::min(score, bestScore);
            }
        }
        return bestScore;
    }
}

int getBestMove(std::vector<std::string> board) {
    int bestScore = -1000;
    int move = -1;
    
    // If it's the first move and center is empty, take it (optimization)
    if (board[4] == "") return 4;

    for (int i = 0; i < 9; i++) {
        if (board[i] == "") {
            board[i] = "O";
            int score = minimax(board, 0, false);
            board[i] = "";
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

// HTTP Server Logic
std::string readFile(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) return "";
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

std::vector<std::string> parseBoardFromJson(std::string body) {
    std::vector<std::string> board(9, "");
    // Locate "board": [ ... ]
    size_t start = body.find("[");
    if (start == std::string::npos) return board;
    size_t end = body.find("]", start);
    if (end == std::string::npos) return board;

    std::string arrayContent = body.substr(start + 1, end - start - 1);
    
    // Naive parsing: split by commas, remove quotes
    int index = 0;
    std::string current;
    bool inQuote = false;
    
    for (char c : arrayContent) {
        if (c == '"') {
            inQuote = !inQuote;
        } else if (inQuote) {
            current += c;
        } else if (c == ',' && index < 9) {
            board[index++] = current;
            current = "";
        }
    }
    if (index < 9) board[index] = current; // Last element

    return board;
}

void handleClient(SOCKET clientSocket) {
    char buffer[BUFFER_SIZE];
    int bytesReceived = recv(clientSocket, buffer, BUFFER_SIZE, 0);
    if (bytesReceived <= 0) {
        closesocket(clientSocket);
        return;
    }

    std::string request(buffer, bytesReceived);
    std::string response;

    std::cout << "Request: " << request.substr(0, request.find("\r\n")) << std::endl;

    if (request.find("GET / ") != std::string::npos || request.find("GET /index.html") != std::string::npos) {
        std::string content = readFile("index.html");
        response = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: " + std::to_string(content.length()) + "\r\n\r\n" + content;
    }
    else if (request.find("GET /style.css") != std::string::npos) {
        std::string content = readFile("style.css");
        response = "HTTP/1.1 200 OK\r\nContent-Type: text/css\r\nContent-Length: " + std::to_string(content.length()) + "\r\n\r\n" + content;
    }
    else if (request.find("GET /script.js") != std::string::npos) {
        std::string content = readFile("script.js");
        response = "HTTP/1.1 200 OK\r\nContent-Type: application/javascript\r\nContent-Length: " + std::to_string(content.length()) + "\r\n\r\n" + content;
    }
    else if (request.find("POST /api/move") != std::string::npos) {
        // Find body
        size_t bodyPos = request.find("\r\n\r\n");
        if (bodyPos != std::string::npos) {
            std::string body = request.substr(bodyPos + 4);
            std::vector<std::string> board = parseBoardFromJson(body);
            
            int move = getBestMove(board);
            
            std::string jsonResponse = "{\"move\": " + std::to_string(move) + "}";
            response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + std::to_string(jsonResponse.length()) + "\r\n\r\n" + jsonResponse;
        }
    }
    else {
        response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
    }

    send(clientSocket, response.c_str(), response.length(), 0);
    closesocket(clientSocket);
}

int main() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed" << std::endl;
        return 1;
    }

    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed" << std::endl;
        WSACleanup();
        return 1;
    }

    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(PORT);

    if (bind(serverSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed" << std::endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    if (listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "Listen failed" << std::endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    std::cout << "Server running on http://localhost:" << PORT << std::endl;

    while (true) {
        SOCKET clientSocket = accept(serverSocket, NULL, NULL);
        if (clientSocket == INVALID_SOCKET) {
            std::cerr << "Accept failed" << std::endl;
            continue;
        }
        
        // Handle in main thread for simplicity since it's turn-based
        handleClient(clientSocket);
    }

    closesocket(serverSocket);
    WSACleanup();
    return 0;
}
