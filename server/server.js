const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuid } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ide', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Mongoose model
const CodeSchema = new mongoose.Schema({
  language: String,
  code: String,
  input: String,
  output: String,
  createdAt: { type: Date, default: Date.now }
});
const CodeModel = mongoose.model('Code', CodeSchema);

// Utility: extract class name from Java code
function extractJavaClassName(code) {
  const match = code.match(/class\s+([A-Za-z_]\w*)/);
  return match ? match[1] : null;
}

// Language config
const langConfig = {
  javascript: {
    ext: 'js',
    cmd: (file, input) => `echo ${JSON.stringify(input)} | node ${file}`
  },
  python: {
    ext: 'py',
    cmd: (file, input) => `echo ${JSON.stringify(input)} | python ${file}`
  },
  c: {
    ext: 'c',
    cmd: (file, input, base) => `gcc ${file} -o ${base}.exe && echo ${JSON.stringify(input)} | ${base}.exe`
  },
  cpp: {
    ext: 'cpp',
    cmd: (file, input, base) => `g++ ${file} -o ${base}.exe && echo ${JSON.stringify(input)} | ${base}.exe`
  },
  java: {
    ext: 'java',
    cmd: (file, input, base, code) => {
      const className = extractJavaClassName(code);
      return className
        ? `javac ${file} && echo ${JSON.stringify(input)} | java ${className}`
        : `echo "Error: Java class name not found."`;
    }
  },
  go: {
    ext: 'go',
    cmd: (file, input) => `echo ${JSON.stringify(input)} | go run ${file}`
  },
  php: {
    ext: 'php',
    cmd: (file, input) => `echo ${JSON.stringify(input)} | php ${file}`
  },
  ruby: {
    ext: 'rb',
    cmd: (file, input) => `echo ${JSON.stringify(input)} | ruby ${file}`
  }
};

// Main execution route
app.post('/run', async (req, res) => {
  try {
    const { language, code, input } = req.body;
    if (!language || !code) return res.status(400).json({ error: 'Missing language or code' });

    const config = langConfig[language];
    if (!config) return res.status(400).json({ error: 'Language not supported' });

    const id = uuid();
    const ext = config.ext;
    const filename = `${id}.${ext}`;
    const filepath = path.join(__dirname, 'temp', filename);
    const execBase = path.join(__dirname, 'temp', id);

    if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');
    fs.writeFileSync(filepath, code);

    const command = config.cmd(filepath, input || '', execBase, code);

    exec(command, { timeout: 7000, cwd: path.join(__dirname, 'temp') }, async (err, stdout, stderr) => {
      try {
        fs.unlinkSync(filepath);
        ['.exe', '.class'].forEach(ext => {
          const tempFile = execBase + ext;
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        });

        const output = stdout || stderr || (err ? err.message : 'No output');

        await CodeModel.create({ language, code, input, output });

        return res.json({ output });
      } catch (e) {
        return res.status(500).json({ error: 'Cleanup or DB save failed: ' + e.message });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Online IDE Backend Running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
