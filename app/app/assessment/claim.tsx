"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { claimAssessment } from "@/app/assessment/actions";

/** Saves answers a visitor gave before signing up (kept in an httpOnly cookie), then refreshes. */
export function ClaimAssessment() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    claimAssessment().then((saved) => {
      if (saved) {
        try { localStorage.removeItem("fl_assessment_answers"); } catch {}
        router.refresh();
      }
    });
  }, [router]);
  return null;
}
