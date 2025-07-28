import React, { useState } from "react";
import MonacoEditor from "react-monaco-editor";
import axios from "axios";
import "./App.css";

const languageTemplates = {
  javascript: {
    code: `let input = '';

process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const lines = input.trim().split('\\n');
  const name = lines[0];
  const age = parseInt(lines[1]);
  const height = parseFloat(lines[2]);
  console.log(\`Hello \${name}, you are \${age} years old and \${height.toFixed(2)} meters tall.\`);
});`,
    input: `Owner\n20\n1.75`,
  },
  python: {
    code: `name = input()
age = int(input())
height = float(input())
print(f"Hello {name}, you are {age} years old and {height:.2f} meters tall.")`,
    input: `Owner\n20\n1.75`,
  },
  java: {
    code: `import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    String name = sc.nextLine();
    int age = sc.nextInt();
    float height = sc.nextFloat();
    System.out.printf("Hello %s, you are %d years old and %.2f meters tall.\\n", name, age, height);
  }
}`,
    input: `Owner\n20\n1.75`,
  },
  c: {
    code: `#include <stdio.h>

int main() {
  char name[100];
  int age;
  float height;
  scanf("%s", name);
  scanf("%d", &age);
  scanf("%f", &height);
  printf("Hello %s, you are %d years old and %.2f meters tall.\\n", name, age, height);
  return 0;
}`,
    input: `Owner\n20\n1.75`,
  },
  cpp: {
    code: `#include <iostream>
using namespace std;

int main() {
  string name;
  int age;
  float height;
  cin >> name >> age >> height;
  cout << "Hello " << name << ", you are " << age << " years old and " << height << " meters tall." << endl;
  return 0;
}`,
    input: `Owner\n20\n1.75`,
  },
  go: {
    code: `package main
import "fmt"

func main() {
  var name string
  var age int
  var height float32
  fmt.Scan(&name, &age, &height)
  fmt.Printf("Hello %s, you are %d years old and %.2f meters tall.\\n", name, age, height)
}`,
    input: `Owner\n20\n1.75`,
  },
  php: {
    code: `<?php
$name = trim(fgets(STDIN));
$age = intval(fgets(STDIN));
$height = floatval(fgets(STDIN));
echo "Hello $name, you are $age years old and " . number_format($height, 2) . " meters tall.\\n";
?>`,
    input: `Owner\n20\n1.75`,
  },
  ruby: {
    code: `name = gets.chomp
age = gets.chomp.to_i
height = gets.chomp.to_f
puts "Hello #{name}, you are #{age} years old and #{'%.2f' % height} meters tall."`,
    input: `Owner\n20\n1.75`,
  },
};

function App() {
  const [language, setLanguage] = useState("c");
  const [code, setCode] = useState(languageTemplates["c"].code);
  const [input, setInput] = useState(languageTemplates["c"].input);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [layout, setLayout] = useState("horizontal");

  const handleRun = async () => {
    setLoading(true);
    setOutput("Running...");
    try {
      const res = await axios.post("http://localhost:5000/run", {
        language,
        code,
        input,
      });
      setOutput(res.data.output || "No output");
    } catch (err) {
      setOutput("Error: " + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const handleLanguageChange = (e) => {
    const selected = e.target.value;
    setLanguage(selected);
    if (languageTemplates[selected]) {
      setCode(languageTemplates[selected].code);
      setInput(languageTemplates[selected].input);
    } else {
      setCode("// Write your code here");
      setInput("");
    }
  };

  const resolveMonacoLang = (lang) => {
    if (lang === "c" || lang === "cpp") return "cpp";
    return lang;
  };

  return (
    <div className={`app ${darkMode ? "dark" : "light"} ${layout}`}>
      <header>
        <h1 className="title">💻 Online IDE</h1>
        <div className="toolbar">
          <button onClick={() => setDarkMode(!darkMode)} className="toggle-theme">
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          <button
            onClick={() => setLayout(layout === "vertical" ? "horizontal" : "vertical")}
            className="toggle-layout"
          >
            {layout === "vertical" ? "🧭 Side by Side" : "🧭 Top/Bottom"}
          </button>
        </div>
      </header>

      <div className="controls">
        <select value={language} onChange={handleLanguageChange}>
          {Object.keys(languageTemplates).map((lang) => (
            <option key={lang} value={lang}>
              {lang.charAt(0).toUpperCase() + lang.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="workspace">
        <div className="editor-wrapper">
          <MonacoEditor
            language={resolveMonacoLang(language)}
            theme={darkMode ? "vs-dark" : "vs-light"}
            value={code}
            onChange={setCode}
            options={{ fontSize: 14, minimap: { enabled: false } }}
          />
        </div>

        <div className="io-panel">
          <h3>Input (stdin):</h3>
          <textarea
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button onClick={handleRun} disabled={loading}>
            {loading ? "Running..." : "▶ Run"}
          </button>
          <h3>Output:</h3>
          <pre className="output-box">{output}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;

