/**
 * Safe clipboard utility with fallback for environments where clipboard is blocked
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // Check if clipboard API is available
  if (!navigator.clipboard) {
    return fallbackCopy(text);
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Clipboard API blocked, use fallback
    return fallbackCopy(text);
  }
}

function fallbackCopy(text: string): boolean {
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
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
}
