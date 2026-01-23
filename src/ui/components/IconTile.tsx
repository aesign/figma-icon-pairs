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
  onGlyphClick?: () => void;
  onNameClick?: () => void;
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
  onGlyphClick,
  onNameClick,
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
          tone === "material"
            ? styles.materialGlyph
            : styles.sfGlyph,
          onGlyphClick && styles.clickable
        )}
        onClick={onGlyphClick}
        role={onGlyphClick ? "button" : undefined}
        tabIndex={onGlyphClick ? 0 : undefined}
      >
        {glyph}
      </div>
      <div
        className={classes(styles.name, onNameClick && styles.clickable)}
        onClick={onNameClick}
        role={onNameClick ? "button" : undefined}
        tabIndex={onNameClick ? 0 : undefined}
      >
        {name}
      </div>
      {badge ? <div className={styles.badge}>{badge}</div> : null}
    </div>
  );
}
