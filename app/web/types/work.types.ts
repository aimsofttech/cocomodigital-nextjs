import type { ReactNode } from "react";

export interface WorkPageMeta {
  title: string;
  description: string;
  path: string;
}

export interface WorkPageSchema {
  "@type": string;
  name: string;
  description?: string;
  provider?: {
    "@type": string;
    name: string;
  };
  [key: string]: unknown;
}

export interface WorkStat {
  value: string;
  label: string;
  suffix?: string;
}

export interface WorkCaseStudy {
  id?: number | string;
  client: string;
  image?: string;
  metrics?: Array<{ label: string; value: string }>;
  tags?: string[];
  description?: string;
}

export interface WorkAudienceSegment {
  icon: ReactNode;
  label: string;
  description?: string;
}

export interface WorkMethodologyPillar {
  step: string;
  title: string;
  description: string;
  icon?: ReactNode;
}

export interface WorkPageData {
  meta: WorkPageMeta;
  schema?: WorkPageSchema;
  hero?: {
    headline?: string;
    subheadline?: string;
    credentialPills?: string[];
  };
  stats?: WorkStat[];
  audienceSegments?: WorkAudienceSegment[];
  methodology?: WorkMethodologyPillar[];
  caseStudies?: WorkCaseStudy[];
  [key: string]: unknown;
}
