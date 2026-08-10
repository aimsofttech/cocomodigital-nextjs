import type { IconType } from "react-icons";
import type { ReactNode } from "react";

/* Shared shapes for the three growth landing pages
   (podcast editing, social video editing, YouTube growth).
   Every page feeds the same section components with its own
   static data, so the layout code is written once. */

export interface CtaLink {
  label: string;
  href: string;
  /** "solid" = filled red, "outline" = red border on white */
  variant?: "solid" | "outline";
  icon?: IconType;
}

export interface FeatureItem {
  icon: IconType;
  title: string;
  description: string;
}

export interface StatItem {
  icon: IconType;
  value: string;
  label: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface MetricRow {
  label: string;
  icon?: IconType;
  before: string;
  after: string;
  growth: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HeroBadge {
  icon: IconType;
  label: string;
}

export interface HeroHeadline {
  text: string;
  /** renders in brand red instead of near-black */
  accent?: boolean;
}

export interface TrustSignal {
  /** initials behind the stacked avatar placeholders */
  initials: string[];
  label: string;
}

export interface CaseStudyContent {
  title: string;
  subtitle?: string;
  paragraphs: string[];
  media: ReactNode;
  rows: MetricRow[];
}
