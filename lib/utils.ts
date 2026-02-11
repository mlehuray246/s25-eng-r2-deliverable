// Add util functions that can be used in both server and client components.
// For more info on how to avoid poisoning your server/client components: https://www.youtube.com/watch?v=BZlwtR9pDp4
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// helper to make it easier to conditionally add Tailwind CSS classes
// https://ui.shadcn.com/docs/installation
// More usage: https://www.neorepo.com/blog/how-to-build-a-button-with-nextjs-and-shadcn-ui

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to pause execution of an async function for the specified number of milliseconds. Useful for debugging (e.g. loading states)
// https://alvarotrigo.com/blog/wait-1-second-javascript/
export function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
