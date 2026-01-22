import { classes } from "@ui/utils/classes.util";
import styles from "./IconTile.module.scss";

type Props = {
  glyph: string;
  name: string;
  tone: "sf" | "material";
  badge?: string | null;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  interactive?: boolean;
  style?: React.CSSProperties;
};

export function IconTile({
  glyph,
  name,
  tone,
  badge,
  selected,
  disabled,
  interactive,
  className,
  style,
}: Props) {
  return (
    <div
      className={classes(
        styles.tile,
        selected && styles.selected,
        disabled && styles.disabled,
        interactive && styles.interactive,
        className
      )}
      style={style}
    >
      <div
        className={classes(
          styles.glyph,
          tone === "material" ? styles.materialGlyph : styles.sfGlyph
        )}
      >
        {glyph}
      </div>
      <div className={styles.name}>{name}</div>
      {badge ? <div className={styles.badge}>{badge}</div> : null}
    </div>
  );
}
