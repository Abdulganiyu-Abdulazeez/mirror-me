import rateLimit from 'express-rate-limit';

export const submissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 submissions per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many anonymous reflections submitted from this IP. Please wait a few minutes before sending another.'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit login/register attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again later.'
  }
});
