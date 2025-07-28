const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/ide", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Language extensions
const extMap = {
  javascript: "js",
  python: "py",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  php: "php",
  ruby: "rb",
};

// Helper for interactive execution
const runInteractive = (cmd, args = [], input = "") => {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd: tempDir });
    let result = "";

    proc.stdout.on("data", (data) => result += data.toString());
    proc.stderr.on("data", (data) => result += data.toString());
    proc.on("close", () => resolve(result));

    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
};

// Run code route
app.post("/run", async (req, res) => {
  const { language, code, input } = req.body;
  if (!language || !code) return res.status(400).json({ output: "Missing fields" });

  const id = uuid();
  const ext = extMap[language];
  const filename = `${id}.${ext}`;
  const filepath = path.join(tempDir, filename);
  fs.writeFileSync(filepath, code);

  const execPath = path.join(tempDir, id);
  const executable = process.platform === "win32" ? `${execPath}.exe` : execPath;

  const cleanup = () => {
    try {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      if (fs.existsSync(executable)) fs.unlinkSync(executable);
      if (fs.existsSync(execPath + ".class")) fs.unlinkSync(execPath + ".class");
      const javaFile = path.join(tempDir, "Main.java");
      if (fs.existsSync(javaFile)) fs.unlinkSync(javaFile);
    } catch {}
  };

  try {
    let output = "";

    switch (language) {
      case "javascript": {
        const result = spawnSync("node", [filepath], { input, encoding: "utf-8" });
        output = result.stdout || result.stderr;
        break;
      }

      case "php": {
        const result = spawnSync("php", [filepath], { input, encoding: "utf-8" });
        output = result.stdout || result.stderr;
        break;
      }

      case "ruby": {
        const result = spawnSync("ruby", [filepath], { input, encoding: "utf-8" });
        output = result.stdout || result.stderr;
        break;
      }

      case "go": {
        const result = spawnSync("go", ["run", filepath], { input, encoding: "utf-8" });
        output = result.stdout || result.stderr;
        break;
      }

      case "python":
        output = await runInteractive("python", [filepath], input);
        break;

      case "c":
      case "cpp": {
        const compiler = language === "c" ? "gcc" : "g++";
        const compile = spawnSync(compiler, [filepath, "-o", executable]);
        if (compile.stderr.toString()) {
          cleanup();
          return res.json({ output: compile.stderr.toString() });
        }
        output = await runInteractive(executable, [], input);
        break;
      }

      case "java": {
        const className = "Main";
        const javaPath = path.join(tempDir, `${className}.java`);
        const modifiedCode = code.replace(/public\s+class\s+\w+/, `public class ${className}`);
        fs.writeFileSync(javaPath, modifiedCode);

        const compile = spawnSync("javac", [javaPath]);
        if (compile.stderr.toString()) {
          cleanup();
          return res.json({ output: compile.stderr.toString() });
        }

        output = await runInteractive("java", ["-cp", tempDir, className], input);
        break;
      }

      default:
        cleanup();
        return res.status(400).json({ output: "Unsupported language." });
    }

    cleanup();
    return res.json({ output: output || "No output" });

  } catch (err) {
    cleanup();
    return res.status(500).json({ output: err.message });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.send("✅ Online IDE Backend Running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

