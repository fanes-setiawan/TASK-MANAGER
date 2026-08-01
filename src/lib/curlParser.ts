export interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function parseCurl(curlString: string): ParsedRequest {
  const result: ParsedRequest = {
    method: "GET",
    url: "",
    headers: {},
    body: "",
  };

  if (!curlString || typeof curlString !== "string") {
    return result;
  }

  // Check if it's Dart/Dio code
  if (curlString.includes("dio.request") || curlString.includes("Dio()")) {
    const urlMatch = curlString.match(/dio\.request\(\s*['"](.*?)['"]/);
    if (urlMatch) result.url = urlMatch[1];
    
    const methodMatch = curlString.match(/method:\s*['"](.*?)['"]/);
    if (methodMatch) result.method = methodMatch[1].toUpperCase();

    const dataMatch = curlString.match(/data:\s*['"](.*?)['"]/s) || curlString.match(/data:\s*({.*?})/s);
    if (dataMatch) {
      result.body = dataMatch[1];
      if (result.method === "GET") result.method = "POST";
    }

    const headersMatch = curlString.match(/(?:var|final|const)\s+headers\s*=\s*({.*?});/s) || curlString.match(/headers:\s*({.*?})/s);
    if (headersMatch) {
      try {
         const hBlock = headersMatch[1];
         const lineRegex = /['"](.*?)['"]\s*:\s*['"](.*?)['"]/g;
         let m;
         while ((m = lineRegex.exec(hBlock)) !== null) {
            result.headers[m[1]] = m[2];
         }
      } catch (e) {}
    }
    return result;
  }

  // Remove newlines and backslashes that escape newlines
  const cleanStr = curlString.replace(/\\\r?\n/g, " ").trim();

  // Basic tokenizer to handle quotes
  const args = [];
  let currentArg = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    if (inQuotes) {
      if (char === quoteChar && cleanStr[i - 1] !== "\\") {
        inQuotes = false;
        args.push(currentArg);
        currentArg = "";
      } else {
        currentArg += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inQuotes = true;
        quoteChar = char;
      } else if (char === " ") {
        if (currentArg.length > 0) {
          args.push(currentArg);
          currentArg = "";
        }
      } else {
        currentArg += char;
      }
    }
  }
  if (currentArg.length > 0) {
    args.push(currentArg);
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.toUpperCase() === "CURL") {
      continue;
    }

    if (arg === "-X" || arg === "--request") {
      result.method = args[i + 1]?.toUpperCase() || "GET";
      i++;
    } else if (arg === "-H" || arg === "--header") {
      const headerStr = args[i + 1];
      if (headerStr) {
        const colonIndex = headerStr.indexOf(":");
        if (colonIndex > 0) {
          const key = headerStr.slice(0, colonIndex).trim();
          const value = headerStr.slice(colonIndex + 1).trim();
          result.headers[key] = value;
        }
      }
      i++;
    } else if (arg === "-d" || arg === "--data" || arg === "--data-raw" || arg === "--data-binary") {
      result.body = args[i + 1] || "";
      if (result.method === "GET") {
        result.method = "POST";
      }
      i++;
    } else if (arg.startsWith("http")) {
      result.url = arg;
    }
  }

  return result;
}
