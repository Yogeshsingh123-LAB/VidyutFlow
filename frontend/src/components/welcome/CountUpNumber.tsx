import React, { useEffect, useState, useRef } from 'react';

interface CountUpNumberProps {
  value: string; // e.g., "3.8M+", "6 Districts", "100%", "Grade A+", "1,20,000+"
  className?: string;
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState<string>(value);
  const ref = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setDisplayValue(value);
        return;
      }
    }

    // Parse the value to find numeric parts
    // e.g. "3.8M+" -> prefix: "", num: 3.8, suffix: "M+"
    // e.g. "6 Districts" -> prefix: "", num: 6, suffix: " Districts"
    // e.g. "100%" -> num: 100, suffix: "%"
    // e.g. "1,20,000+" -> num: 120000, suffix: "+" with indian comma formatting
    // e.g. "Grade A+" -> non-numeric, just return
    const match = value.match(/^([^0-9]*)([\d,.]+)(.*)$/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const prefix = match[1];
    const rawNumberStr = match[2].replace(/,/g, '');
    const targetNum = parseFloat(rawNumberStr);
    const suffix = match[3];

    if (isNaN(targetNum)) {
      setDisplayValue(value);
      return;
    }

    const isDecimal = match[2].includes('.');
    const decimalPlaces = isDecimal ? match[2].split('.')[1].length : 0;
    const hasCommas = match[2].includes(',');

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          const duration = 1200; // ms
          const startTime = performance.now();

          const update = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = targetNum * easeOut;

            let formattedNum = isDecimal ? current.toFixed(decimalPlaces) : Math.round(current).toString();
            if (hasCommas) {
              // Format with commas
              const parts = formattedNum.split('.');
              parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              formattedNum = parts.join('.');
            }

            setDisplayValue(`${prefix}${formattedNum}${suffix}`);

            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              setDisplayValue(value); // exact match on completion
            }
          };

          requestAnimationFrame(update);
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};
