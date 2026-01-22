import { classes } from "@ui/utils/classes.util";
import { ComponentProps } from "react";
import styles from "./Button.module.scss";

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
};

export const Button = ({
  variant = "primary",
  className,
  children,
  icon,
  ...rest
}: Props) => {
  return (
    <button
      {...rest}
      className={classes(
        styles.button,
        styles[variant],
        icon && !children && styles.iconOnly,
        className
      )}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children}
    </button>
  );
};
