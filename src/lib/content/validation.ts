
export interface Prerequisite {
  type: 'topic' | 'difficulty';
  id?: string;
  title?: string;
  level?: number;
  description?: string;
}

export interface TopicTags {
  tags: string[];
}

export function validatePrerequisites(prerequisites: any): string[] {
  if (!Array.isArray(prerequisites)) {
    throw new Error('Prerequisites must be an array');
  }

  return prerequisites.map((prereq, index) => {
    if (typeof prereq === 'string') {
      if (prereq.trim().length < 2 || prereq.trim().length > 100) {
        throw new Error(`Prerequisite at index ${index} must be between 2-100 characters`);
      }
      return prereq.trim();
    }

    if (typeof prereq === 'object' && prereq !== null) {
      if (!prereq.type || !['topic', 'difficulty'].includes(prereq.type)) {
        throw new Error(`Invalid prerequisite type at index ${index}`);
      }

      if (prereq.type === 'topic') {
        if (!prereq.id || !prereq.title) {
          throw new Error(`Topic prerequisite at index ${index} must have id and title`);
        }
        return prereq.title;
      }

      if (prereq.type === 'difficulty') {
        if (!prereq.level || prereq.level < 1 || prereq.level > 4) {
          throw new Error(`Difficulty prerequisite at index ${index} must have level between 1-4`);
        }
        return `Level ${prereq.level}`;
      }
    }

    throw new Error(`Invalid prerequisite format at index ${index}`);
  });
}

export function validateTags(tags: any): string[] {
  if (!Array.isArray(tags)) {
    throw new Error('Tags must be an array');
  }

  return tags.map((tag, index) => {
    if (typeof tag !== 'string') {
      throw new Error(`Tag at index ${index} must be a string`);
    }
    
    if (tag.length < 2 || tag.length > 50) {
      throw new Error(`Tag at index ${index} must be between 2-50 characters`);
    }

    return tag.toLowerCase().trim();
  });
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
}

export function performQualityChecks(content: {
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
}): QualityCheckResult {
  const issues: string[] = [];
  let score = 100;

  const wordCount = content.content.split(/\s+/).length;
  if (wordCount < 500) {
    issues.push(`Content too short: ${wordCount} words (minimum 500)`);
    score -= 20;
  }

  if (!content.metaTitle || content.metaTitle.length > 60) {
    issues.push('Meta title missing or too long (max 60 characters)');
    score -= 15;
  }

  if (!content.metaDescription || content.metaDescription.length > 160) {
    issues.push('Meta description missing or too long (max 160 characters)');
    score -= 15;
  }

  if (content.title.length > 100) {
    issues.push('Title too long (max 100 characters)');
    score -= 10;
  }

  const sentences = content.content.split(/[.!?]+/);
  const avgSentenceLength = sentences.reduce((acc, sentence) => 
    acc + sentence.split(/\s+/).length, 0) / sentences.length;
  
  if (avgSentenceLength > 25) {
    issues.push('Content may be difficult to read (long sentences)');
    score -= 10;
  }

  return {
    passed: score >= 70,
    score: Math.max(0, score),
    issues
  };
}
