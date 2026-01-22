import { classes } from "@ui/utils/classes.util";
import { ComponentProps } from "react";
import styles from "./Select.module.scss";

type Props = ComponentProps<"select">;

export const Select = ({ className, children, ...rest }: Props) => {
  return (
    <select {...rest} className={classes(styles.select, className)}>
      {children}
    </select>
  );
};
