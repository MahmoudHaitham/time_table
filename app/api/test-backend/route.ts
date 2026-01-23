import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const baseUrl = backendUrl.replace("/api", "");
    
    // Test health endpoint
    const healthResponse = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!healthResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Backend responded with status: ${healthResponse.status}`,
          status: healthResponse.status,
        },
        { status: 500 }
      );
    }

    const healthData = await healthResponse.json();

    // Test API endpoint
    const apiResponse = await fetch(`${baseUrl}/api/test`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const apiData = apiResponse.ok ? await apiResponse.json() : null;

    return NextResponse.json({
      success: true,
      message: "Backend is reachable from Next.js server",
      health: healthData,
      apiTest: apiData,
      backendUrl: baseUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Cannot reach backend server",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
