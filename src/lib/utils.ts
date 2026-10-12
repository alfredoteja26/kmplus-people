import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The type ramp in globals.css (@theme --text-*) is unknown to tailwind-merge, which would otherwise read
// `text-h2` or `text-micro` as a color and drop it whenever a real text color follows.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display", "h1", "h2", "label", "micro"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
