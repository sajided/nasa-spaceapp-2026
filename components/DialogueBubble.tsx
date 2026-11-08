import styles from "./DialogueBubble.module.css";
import { Speaker } from "@/data/script";

interface DialogueBubbleProps {
  speaker: Speaker;
  text: string;
  emotion?: string;
}

export default function DialogueBubble({ speaker, text, emotion }: DialogueBubbleProps) {
  const isEarth = speaker === "earth";

  // Simple formatter to bold words wrapped in ** like **Descent Stage**
  const renderFormattedText = (rawText: string) => {
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div
      className={`${styles.container} ${isEarth ? styles.earthContainer : styles.moonContainer}`}
    >
      <div className={styles.avatar}>
        {isEarth ? (
          <span className={styles.earthAvatar} role="img" aria-label="Earth">
            🌍
          </span>
        ) : (
          <span className={styles.moonAvatar} role="img" aria-label="Moon">
            🌕
          </span>
        )}
      </div>

      <div className={`${styles.bubble} ${isEarth ? styles.earthBubble : styles.moonBubble}`}>
        <div className={styles.header}>
          <span className={styles.speakerName}>{isEarth ? "Earth" : "Moon"}</span>
          {emotion && <span className={styles.emotion}>*({emotion})*</span>}
        </div>
        <p className={styles.text}>{renderFormattedText(text)}</p>
      </div>
    </div>
  );
}

