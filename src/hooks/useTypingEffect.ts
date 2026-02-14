import { useState, useEffect, useRef, useMemo } from 'react';

interface UseTypingEffectOptions {
  charsPerFrame?: number;
  onComplete?: () => void;
}

/** Count only visible text characters in an HTML string (skip tags). */
function countTextChars(html: string): number {
  let count = 0;
  let inTag = false;
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') inTag = true;
    else if (html[i] === '>') inTag = false;
    else if (!inTag) count++;
  }
  return count;
}

/** Slice HTML by visible text character count, never breaking mid-tag. */
function htmlSafeSlice(html: string, maxTextChars: number): string {
  let textCount = 0;
  let inTag = false;
  let i = 0;

  while (i < html.length && textCount < maxTextChars) {
    if (html[i] === '<') {
      inTag = true;
      i++;
      continue;
    }
    if (html[i] === '>') {
      inTag = false;
      i++;
      continue;
    }
    if (!inTag) textCount++;
    i++;
  }

  // If we stopped inside a tag, advance past the closing '>'
  if (inTag) {
    const closeIdx = html.indexOf('>', i);
    if (closeIdx !== -1) i = closeIdx + 1;
  }

  return html.slice(0, i);
}

export function useTypingEffect(
  html: string,
  active: boolean,
  options: UseTypingEffectOptions = {},
): string {
  const { charsPerFrame = 8, onComplete } = options;
  const [count, setCount] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const textLength = useMemo(() => countTextChars(html), [html]);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }

    setCount(0);
    const interval = setInterval(() => {
      setCount(prev => {
        const next = prev + charsPerFrame;
        if (next >= textLength) {
          clearInterval(interval);
          onCompleteRef.current?.();
          return textLength;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [active, html, charsPerFrame, textLength]);

  if (!active) return html;
  return htmlSafeSlice(html, count);
}
