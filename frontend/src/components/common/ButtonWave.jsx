import { useEffect } from 'react';
import './ButtonWave.css';

const buttonSelector = 'button, input:is([type="button"], [type="submit"], [type="reset"], [type="image"]), [role="button"], a.ant-btn';
const builtInWave = 'button.ant-btn:not(.ant-btn-variant-text, .ant-btn-variant-link)';
const boundsKeys = ['left', 'top', 'width', 'height'];

export default function ButtonWave() {
  useEffect(() => {
    const active = new Map();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    function remove(button) {
      const effect = active.get(button);
      if (!effect) return;
      window.cancelAnimationFrame(effect.frame);
      window.clearTimeout(effect.timeout);
      effect.ring?.remove();
      button.removeAttribute('data-button-wave-moving');
      active.delete(button);
    }

    function suppress(button) {
      const effect = active.get(button);
      if (effect.ring || !button.isConnected) {
        remove(button);
      } else {
        window.cancelAnimationFrame(effect.frame);
        button.setAttribute('data-button-wave-moving', '');
      }
    }

    function suppressAll() {
      for (const button of active.keys()) suppress(button);
    }

    function show(event) {
      if (reducedMotion?.matches || !(event.target instanceof Element)) return;
      const button = event.target.closest(buttonSelector);
      if (!button || button.matches(':disabled, .ant-btn-loading') ||
          button.closest('[aria-disabled="true"], [aria-busy="true"], [inert]')) return;

      const bounds = button.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      remove(button);

      let ring;
      if (!button.matches(builtInWave)) {
        const style = window.getComputedStyle(button);
        ring = document.createElement('span');
        ring.className = 'button-wave';
        ring.setAttribute('aria-hidden', 'true');
        Object.assign(ring.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`,
          borderRadius: style.borderRadius, color: style.color });
      }

      const effect = { ring, timeout: window.setTimeout(() => remove(button), 2100) };
      const checkPosition = () => {
        const current = button.getBoundingClientRect();
        if (!button.isConnected || boundsKeys.some(key => Math.abs(current[key] - bounds[key]) > 0.5)) {
          suppress(button);
          return;
        }
        if (ring && !ring.isConnected) document.body.append(ring);
        effect.frame = window.requestAnimationFrame(checkPosition);
      };
      active.set(button, effect);
      // Let the original click update the UI before drawing the fallback ripple.
      effect.frame = window.requestAnimationFrame(checkPosition);
    }

    document.addEventListener('click', show, true);
    window.addEventListener('scroll', suppressAll, true);
    window.addEventListener('resize', suppressAll);
    return () => {
      document.removeEventListener('click', show, true);
      window.removeEventListener('scroll', suppressAll, true);
      window.removeEventListener('resize', suppressAll);
      for (const button of active.keys()) remove(button);
    };
  }, []);

  return null;
}
