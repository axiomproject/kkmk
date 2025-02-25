const profanityList = [
  "amputa",
  "animal ka",
  "bilat",
  "binibrocha",
  "bobo",
  "bogo",
  "boto",
  // ...add the rest of the profanity list from backend
];

export const checkProfanity = (text: string): boolean => {
  if (!text) return false;
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => 
    profanityList.some(badWord => 
      word.includes(badWord.toLowerCase())
    )
  );
};

interface ContentToValidate {
  title?: string;
  content?: string;
  pollOptions?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  field?: string;  // Add this to identify which field has profanity
}

export const validateContent = (content: ContentToValidate): ValidationResult => {
  if (content.title && checkProfanity(content.title)) {
    return {
      isValid: false,
      error: 'Your title contains inappropriate language',
      field: 'title'
    };
  }

  if (content.content && checkProfanity(content.content)) {
    return {
      isValid: false,
      error: 'Your content contains inappropriate language',
      field: 'content'
    };
  }

  if (content.pollOptions) {
    const profaneIndex = content.pollOptions.findIndex(option => checkProfanity(option));
    if (profaneIndex !== -1) {
      return {
        isValid: false,
        error: `Option ${profaneIndex + 1} contains inappropriate language`,
        field: `pollOption-${profaneIndex}`
      };
    }
  }

  return { isValid: true };
};
