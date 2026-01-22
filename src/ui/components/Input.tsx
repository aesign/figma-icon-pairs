import { classes } from "@ui/utils/classes.util";
import { ComponentProps, forwardRef } from "react";
import styles from "./Input.module.scss";

type Props = ComponentProps<"input">;

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, ...rest }, ref) => {
    return (
      <input ref={ref} {...rest} className={classes(styles.input, className)} />
    );
  }
);

Input.displayName = "Input";
