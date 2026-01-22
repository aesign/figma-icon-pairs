import { ReactNode } from "react";
import styles from "./SectionHeader.module.scss";
import { classes } from "@ui/utils/classes.util";

type Props = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  actions,
  children,
  className,
}: Props) {
  return (
    <div className={classes(styles.sectionHeader, className)}>
      <div style={{ flex: 1, height: "32px", alignContent: "center"}}>
        <div className={styles.sectionTitle}>{title}</div>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        {children ? (
          <div className={styles.sectionChildren}>{children}</div>
        ) : null}
      </div>
      {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
    </div>
  );
}
