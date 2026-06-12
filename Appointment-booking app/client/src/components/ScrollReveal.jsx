import { useEffect, useRef, useState } from 'react';

/**
 * Wraps children in a div that fades/slides up when scrolled into view.
 * Uses Intersection Observer — no scroll event listeners.
 *
 * @param {object}   props
 * @param {string}   [props.animation='animate-reveal'] - CSS animation class
 * @param {string}   [props.delay] - Optional animation-delay (e.g. '0.1s')
 * @param {number}   [props.threshold=0.1] - Intersection threshold
 * @param {string}   [props.stagger] - If provided, adds stagger delay based on index
 * @param {number}   [props.index=0] - Index for stagger calculation
 * @param {string}   [props.className] - Additional classes
 * @param {boolean}  [props.triggerOnce=true] - Only animate once
 */
export default function ScrollReveal({
  children,
  animation = 'animate-reveal',
  delay,
  threshold = 0.1,
  stagger,
  index = 0,
  className = '',
  triggerOnce = true,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  const style = {};
  if (delay) style.animationDelay = delay;
  if (stagger) style.animationDelay = `calc(0.08s * ${index + 1})`;

  return (
    <div
      ref={ref}
      className={`${visible ? animation : 'opacity-0'} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
