import { cn } from "~/core/utils";

import styles from "./LoadingAnimation.module.css";

export function LoadingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn(styles.loadingAnimation, className)}>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}
