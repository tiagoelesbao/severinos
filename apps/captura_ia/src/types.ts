export type CategoryType = 
  | 'ALL' 
  | 'AUTOMATION' 
  | 'AI ADS' 
  | 'AI CONTENT' 
  | 'CLAUDE' 
  | 'PROMPTS' 
  | 'LEAD GENERATION' 
  | 'TOOLS AND SKILLS';

export interface ArticleStep {
  stepNumber: number;
  title: string;
  description: string;
  codeSnippet?: string;
  copyableText?: string;
}

export interface Resource {
  id: string;
  slug: string;
  title: string;
  category: CategoryType;
  description: string;
  subtitle?: string;
  whatYouWillDo?: string[];
  beforeYouStart?: string[];
  steps?: ArticleStep[];
  troubleshooting?: string[];
  goDeeperLinks?: { label: string; url: string }[];
  fullContent?: string;
  promptText?: string;
  downloadUrl?: string;
  videoUrl?: string;
  estimatedReadTime?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  updatedDate?: string;
  tags: string[];
  isFeatured?: boolean;
}

export interface UserLead {
  fullName: string;
  email: string;
  phone: string;
  agreedToTerms: boolean;
}
