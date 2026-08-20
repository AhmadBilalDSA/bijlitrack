export const getGroqApiKey = () => process.env.GROQ_API_KEY?.trim();

export const warnAboutMissingOptionalEnv = () => {
  const missing = [];

  if (!getGroqApiKey()) {
    missing.push('GROQ_API_KEY (AI report generation disabled)');
  }

  if (missing.length > 0) {
    console.warn(`[Config] Missing optional environment variables: ${missing.join(', ')}`);
  }
};
