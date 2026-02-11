/**
 * Safe clipboard utility with fallback for environments where clipboard is blocked.
 * Optionally restores focus to a target element after copy so the page does not fade or lose focus (e.g. when toast appears).
 */

export interface CopyToClipboardOptions {
  /** Restore focus to this element after copy (avoids page "fading" when focus moves to toast/portal). */
  restoreFocusTarget?: HTMLElement | null;
}

export async function copyToClipboard(text: string, options?: CopyToClipboardOptions): Promise<boolean> {
  const restoreFocusTarget = options?.restoreFocusTarget ?? null;

  // Check if clipboard API is available
  if (!navigator.clipboard) {
    return fallbackCopy(text, restoreFocusTarget);
  }

  try {
    await navigator.clipboard.writeText(text);
    restoreFocusTarget?.focus();
    return true;
  } catch (error) {
    // Clipboard API blocked, use fallback
    return fallbackCopy(text, restoreFocusTarget);
  }
}

function fallbackCopy(text: string, restoreFocusTarget?: HTMLElement | null): boolean {
  const previousActiveElement =
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  // Create a temporary textarea element
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Make it invisible and non-interactive
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    (restoreFocusTarget ?? previousActiveElement)?.focus();
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    (restoreFocusTarget ?? previousActiveElement)?.focus();
    return false;
  }
}
