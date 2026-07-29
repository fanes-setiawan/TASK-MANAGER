"use client";

import React from "react";
import DirectChat from "@/components/DirectChat";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DirectChat />
    </>
  );
}
