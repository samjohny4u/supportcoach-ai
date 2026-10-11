"use client";

import { useEffect } from "react";

// Public marketing page: hide the dashboard nav (Upload / Dashboard), the same way the
// /extension page does. Prospects opening the pilot link from an email are not users of
// the transcript dashboard.
export default function HideAppNav() {
  useEffect(() => {
    document.body.classList.add("hide-dashboard-nav");
    return () => document.body.classList.remove("hide-dashboard-nav");
  }, []);
  return null;
}
