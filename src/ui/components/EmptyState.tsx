import { ReactNode } from "react";
import styles from "./EmptyState.module.scss";

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function EmptyState({ title, subtitle, children }: Props) {
  return (
    <div className={styles.emptyWrapper}>
      <div className={styles.empty}>
        <div className={styles.title}>{title}</div>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {children ? <div className={styles.actions}>{children}</div> : null}
      </div>
    </div>
  );
}
