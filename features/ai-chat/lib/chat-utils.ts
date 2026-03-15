import { FileAttachment, CodeSuggestion } from "./chat-types";

export const detectLanguage = (fileName: string, content: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext) {
    const langMap: { [key: string]: string } = {
      js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
      py: "python", java: "java", cpp: "cpp", c: "c", html: "html",
      css: "css", scss: "scss", sass: "sass", json: "json", xml: "xml",
      yaml: "yaml", yml: "yaml", md: "markdown", sql: "sql", sh: "bash",
      bash: "bash", ps1: "powershell", php: "php", rb: "ruby", go: "go",
      rs: "rust", swift: "swift", kt: "kotlin", dart: "dart", r: "r",
      scala: "scala", clj: "clojure", hs: "haskell", elm: "elm",
      vue: "vue", svelte: "svelte",
    };
    return langMap[ext] || "text";
  }

  if (content.includes("import React") || content.includes("useState")) return "jsx";
  if (content.includes("interface ") || content.includes(": string")) return "typescript";
  if (content.includes("def ") && content.includes("import ")) return "python";
  if (content.includes("package ") && content.includes("public class")) return "java";
  if (content.includes("#include") && content.includes("int main")) return "cpp";
  if (content.includes("<!DOCTYPE html") || content.includes("<html")) return "html";
  if (content.includes("SELECT") && content.includes("FROM")) return "sql";

  return "text";
};

export const detectFileType = (fileName: string, content: string): FileAttachment["type"] => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (
    ["js", "jsx", "ts", "tsx", "py", "java", "cpp", "c", "html", "css", "scss", "json", "xml", "yaml", "sql", "sh", "php", "rb", "go", "rs"].includes(ext || "")
  ) return "code";
  return "code"; 
};

export const generateCodeSuggestions = (
  content: string,
  attachments: FileAttachment[],
  activeFileName?: string,
  activeFileContent?: string,
  activeFileLanguage?: string
): CodeSuggestion[] => {
  const suggestions: CodeSuggestion[] = [];

  if (activeFileContent && activeFileName) {
    if (content.toLowerCase().includes("security") || content.toLowerCase().includes("vulnerability")) {
      suggestions.push({
        id: "security-headers",
        title: "Add Security Headers",
        description: "Implement security headers for web applications",
        code: `// Security headers middleware\nconst securityHeaders = {\n  'X-Content-Type-Options': 'nosniff',\n  'X-Frame-Options': 'DENY',\n  'X-XSS-Protection': '1; mode=block',\n  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',\n  'Content-Security-Policy': "default-src 'self'"\n};\n\napp.use((req, res, next) => {\n  Object.entries(securityHeaders).forEach(([key, value]) => {\n    res.setHeader(key, value);\n  });\n  next();\n});`,
        language: activeFileLanguage || "javascript",
        fileName: activeFileName,
        confidence: 0.9,
        category: "security",
      });
    }

    if (content.toLowerCase().includes("optimize") || content.toLowerCase().includes("performance")) {
      suggestions.push({
        id: "performance-optimization",
        title: "Performance Optimization",
        description: "Optimize component rendering with React.memo and useMemo",
        code: `import React, { memo, useMemo, useCallback } from 'react';\n\nconst OptimizedComponent = memo(({ data, onUpdate }) => {\n  const processedData = useMemo(() => {\n    return data.map(item => ({\n      ...item,\n      processed: true\n    }));\n  }, [data]);\n\n  const handleUpdate = useCallback((id) => {\n    onUpdate(id);\n  }, [onUpdate]);\n\n  return (\n    <div>\n      {processedData.map(item => (\n        <div key={item.id} onClick={() => handleUpdate(item.id)}>\n          {item.name}\n        </div>\n      ))}\n    </div>\n  );\n});\n\nexport default OptimizedComponent;`,
        language: activeFileLanguage || "jsx",
        fileName: activeFileName,
        confidence: 0.85,
        category: "optimization",
      });
    }

    if (content.toLowerCase().includes("error") || content.toLowerCase().includes("fix")) {
      suggestions.push({
        id: "error-boundary",
        title: "Add Error Boundary",
        description: "Comprehensive error boundary for React applications",
        code: `import React from 'react';\n\nclass ErrorBoundary extends React.Component {\n  constructor(props) {\n    super(props);\n    this.state = { hasError: false, error: null, errorInfo: null };\n  }\n\n  static getDerivedStateFromError(error) {\n    return { hasError: true };\n  }\n\n  componentCatch(error, errorInfo) {\n    this.setState({ error: error, errorInfo: errorInfo });\n    console.error('Error caught by boundary:', error, errorInfo);\n  }\n\n  render() {\n    if (this.state.hasError) {\n      return (\n        <div className="error-boundary">\n          <h2>Something went wrong.</h2>\n          <details style={{ whiteSpace: 'pre-wrap' }}>\n            {this.state.error && this.state.error.toString()}\n            <br />\n            {this.state.errorInfo?.componentStack}\n          </details>\n        </div>\n      );\n    }\n    return this.props.children;\n  }\n}`,
        language: activeFileLanguage || "jsx",
        fileName: activeFileName,
        confidence: 0.88,
        category: "bug_fix",
      });
    }

    if (activeFileLanguage === "typescript" || activeFileLanguage === "tsx") {
      suggestions.push({
        id: "advanced-types",
        title: "Advanced TypeScript Types",
        description: "Improve type safety with advanced TypeScript patterns",
        code: `// Utility types for better type safety\ntype DeepReadonly<T> = {\n  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];\n};\n\ntype NonNullable<T> = T extends null | undefined ? never : T;\n\ntype ApiResponse<T> = {\n  data: T;\n  status: 'success' | 'error';\n  message?: string;\n  timestamp: Date;\n};\n\n// Generic hook with proper typing\nfunction useApi<T>(url: string): {\n  data: T | null;\n  loading: boolean;\n  error: string | null;\n  refetch: () => Promise<void>;\n} {\n  const [data, setData] = useState<T | null>(null);\n  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n\n  const refetch = useCallback(async () => {\n    setLoading(true);\n    setError(null);\n    try {\n      const response = await fetch(url);\n      const result: ApiResponse<T> = await response.json();\n      setData(result.data);\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Unknown error');\n    } finally {\n      setLoading(false);\n    }\n  }, [url]);\n\n  return { data, loading, error, refetch };\n}`,
        language: "typescript",
        fileName: activeFileName,
        confidence: 0.92,
        category: "feature",
      });
    }
  }

  attachments.forEach((file) => {
    if (file.type === "code") {
      if (file.content.includes("TODO") || file.content.includes("FIXME")) {
        suggestions.push({
          id: `todo-${file.id}`,
          title: `Complete TODO in ${file.name}`,
          description: "Implementation for the TODO comment",
          code: `// Implementation for TODO\nconst implementation = async () => {\n  try {\n    // Add your logic here\n    const result = await performOperation();\n    return { success: true, data: result };\n  } catch (error) {\n    console.error('Operation failed:', error);\n    return { success: false, error: error.message };\n  }\n};`,
          language: file.language,
          fileName: file.name,
          confidence: 0.7,
          category: "feature",
        });
      }

      if (file.content.includes("console.log") && file.language === "javascript") {
        suggestions.push({
          id: `logging-${file.id}`,
          title: `Improve Logging in ${file.name}`,
          description: "Replace console.log with proper logging",
          code: `// Improved logging utility\nconst logger = {\n  info: (message, data) => {\n    console.info(\`[INFO] \${new Date().toISOString()}: \${message}\`, data);\n  },\n  warn: (message, data) => {\n    console.warn(\`[WARN] \${new Date().toISOString()}: \${message}\`, data);\n  },\n  error: (message, error) => {\n    console.error(\`[ERROR] \${new Date().toISOString()}: \${message}\`, error);\n  },\n  debug: (message, data) => {\n    if (process.env.NODE_ENV === 'development') {\n      console.debug(\`[DEBUG] \${new Date().toISOString()}: \${message}\`, data);\n    }\n  }\n};\n\n// Usage: logger.info('User logged in', { userId: 123 });`,
          language: file.language,
          fileName: file.name,
          confidence: 0.75,
          category: "refactor",
        });
      }
    }
  });

  return suggestions;
};

export const getChatModePrompt = (mode: string, content: string, context: any) => {
  switch (mode) {
    case "review":
      return `Please review this code and provide detailed suggestions for improvement, including performance, security, and best practices:\n\n**Context:** ${JSON.stringify(context)}\n\n**Request:** ${content}`;
    case "fix":
      return `Please help fix issues in this code, including bugs, errors, and potential problems:\n\n**Context:** ${JSON.stringify(context)}\n\n**Problem:** ${content}`;
    case "optimize":
      return `Please analyze this code for performance optimizations and suggest improvements:\n\n**Context:** ${JSON.stringify(context)}\n\n**Code to optimize:** ${content}`;
    default:
      return content;
  }
};