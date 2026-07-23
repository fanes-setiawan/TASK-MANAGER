import dynamic from "next/dynamic";
import React from "react";

// Dynamically import the login component and disable Server-Side Rendering.
// This prevents Firebase auth from crashing the Cloudflare Workers edge runtime during SSR.
const LoginComponent = dynamic(() => import("./LoginComponent"), {
  ssr: false,
});

export default function Page() {
  return <LoginComponent />;
}
