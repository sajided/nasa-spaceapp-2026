import styles from "./Timeline.module.css";

interface TimelineProps {
  time: string;
  label?: string;
}

export default function Timeline({ time, label }: TimelineProps) {
  return (
    <div className={styles.badge} aria-label={`Mission time: ${time}`}>
      <span className={styles.pulseDot} />
      <span className={styles.timeText}>{time}</span>
      {label && <span className={styles.labelText}>{label}</span>}
    </div>
  );
}

