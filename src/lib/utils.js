
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name) => {
  if (!name?.trim()) return '';
  const names = name.split(' ').filter(Boolean);
  if (names.length === 0) return '';
  const firstInitial = names[0][0];
  const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
  return (firstInitial + lastInitial).toUpperCase();
};
