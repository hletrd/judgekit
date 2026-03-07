export interface LanguageConfig {
  name: string;
  extension: string;
  dockerImage: string;
  compileCommand?: string[];
  runCommand: string[];
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  c17: {
    name: "C17",
    extension: ".c",
    dockerImage: "judge-cpp:latest",
    compileCommand: ["gcc", "-O2", "-std=c17", "-o", "/workspace/solution", "/workspace/solution.c", "-lm"],
    runCommand: ["/workspace/solution"],
  },
  c23: {
    name: "C23",
    extension: ".c",
    dockerImage: "judge-cpp:latest",
    compileCommand: ["gcc", "-O2", "-std=c23", "-o", "/workspace/solution", "/workspace/solution.c", "-lm"],
    runCommand: ["/workspace/solution"],
  },
  cpp20: {
    name: "C++20",
    extension: ".cpp",
    dockerImage: "judge-cpp:latest",
    compileCommand: ["g++", "-O2", "-std=c++20", "-o", "/workspace/solution", "/workspace/solution.cpp"],
    runCommand: ["/workspace/solution"],
  },
  cpp23: {
    name: "C++23",
    extension: ".cpp",
    dockerImage: "judge-cpp:latest",
    compileCommand: ["g++", "-O2", "-std=c++23", "-o", "/workspace/solution", "/workspace/solution.cpp"],
    runCommand: ["/workspace/solution"],
  },
  python: {
    name: "Python 3",
    extension: ".py",
    dockerImage: "judge-python:latest",
    runCommand: ["python3", "/workspace/solution.py"],
  },
};
