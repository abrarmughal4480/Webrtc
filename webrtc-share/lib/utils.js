import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}



export function evaluatePasswordStrength(password) {
  if (!password || password.length < 6) return 0; // Too short = weak

  let strength = 0;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;

  const criteriaMet = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (criteriaMet >= 3 && isLongEnough) {
    strength = 2; // Strong
  } else if (criteriaMet >= 2) {
    strength = 1; // Medium
  } else {
    strength = 0; // Weak
  }

  return strength;
}