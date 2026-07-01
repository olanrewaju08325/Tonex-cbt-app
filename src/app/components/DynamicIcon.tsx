import React from "react";
import * as LucideIcons from "lucide-react";

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function DynamicIcon({ name, size = 16, className = "", color }: DynamicIconProps) {
  // Normalize string name (e.g. "TrendingUp" or "trending-up" or "trending_up")
  const formattedName = name
    .replace(/(-\w)/g, (m) => m[1].toUpperCase()) // convert kebab-case to camelCase
    .replace(/(_\w)/g, (m) => m[1].toUpperCase()) // convert snake_case to camelCase
    .replace(/^\w/, (c) => c.toUpperCase()); // capitalize first letter

  // Fallback map for common aliases
  const iconMap: Record<string, string> = {
    "Calculator": "Calculator",
    "Award": "Award",
    "Trendingup": "TrendingUp",
    "Bookmark": "Bookmark",
    "Bookopen": "BookOpen",
    "Timer": "Timer",
    "Hash": "Hash",
    "Shield": "Shield",
    "Trophy": "Trophy",
    "Zap": "Zap",
    "Star": "Star",
    "Settings": "Settings",
    "Bell": "Bell",
    "Crown": "Crown"
  };

  const lookupName = iconMap[formattedName] || formattedName;
  const IconComponent = (LucideIcons as any)[lookupName] || LucideIcons.HelpCircle;

  return <IconComponent size={size} className={className} color={color} />;
}
