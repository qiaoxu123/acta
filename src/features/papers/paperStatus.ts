import type { PaperStatus } from "@/db/types";

export const PAPER_STATUSES: PaperStatus[] = [
  "idea",
  "drafting",
  "internal_review",
  "submitted",
  "under_review",
  "major_revision",
  "minor_revision",
  "accepted",
  "rejected",
  "camera_ready",
  "published",
];

export const STATUS_LABEL: Record<PaperStatus, string> = {
  idea: "Idea",
  drafting: "Drafting",
  internal_review: "Internal review",
  submitted: "Submitted",
  under_review: "Under review",
  major_revision: "Major revision",
  minor_revision: "Minor revision",
  accepted: "Accepted",
  rejected: "Rejected",
  camera_ready: "Camera-ready",
  published: "Published",
};

export const STATUS_TONE: Record<
  PaperStatus,
  "neutral" | "accent" | "warn" | "ok" | "urgent"
> = {
  idea: "neutral",
  drafting: "neutral",
  internal_review: "neutral",
  submitted: "accent",
  under_review: "accent",
  major_revision: "warn",
  minor_revision: "warn",
  accepted: "ok",
  rejected: "urgent",
  camera_ready: "ok",
  published: "ok",
};
