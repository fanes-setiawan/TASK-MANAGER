import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, url, headers, payload } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: headers || {},
    };

    if (payload && ["POST", "PUT", "PATCH"].includes(fetchOptions.method as string)) {
      fetchOptions.body = payload;
    }

    const startTime = performance.now();
    const response = await fetch(url, fetchOptions);
    const endTime = performance.now();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBlob = await response.blob();
    const size = responseBlob.size;

    let responseData;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = JSON.parse(await responseBlob.text());
      } catch (e) {
        responseData = await responseBlob.text();
      }
    } else {
      responseData = await responseBlob.text();
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      time: Math.round(endTime - startTime),
      size,
      data: responseData,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 0,
      statusText: "Proxy Error",
      time: 0,
      size: 0,
      data: error.message || "Failed to fetch through proxy",
      headers: {},
    }, { status: 500 });
  }
}
