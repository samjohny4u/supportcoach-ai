"use client";

import { useEffect } from "react";
import { storeFirstTouch } from "@/lib/attribution";

// Records the visitor's FIRST-TOUCH acquisition params (utm_*, ref, gclid, landing path,
// referrer domain only) into localStorage so signup CTAs can carry them across to
// admin.supportcoach.io. First-party, no cookie, sends nothing anywhere — see
// src/lib/attribution.ts. Renders nothing.
export default function AttributionCapture() {
  useEffect(() => {
    storeFirstTouch();
  }, []);

  return null;
}
