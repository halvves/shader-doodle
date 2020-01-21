const TOUCH_EVENTS = new Set(['touchstart', 'touchmove', 'touchend']);

const mouseOrTouch = e =>
  TOUCH_EVENTS.has(e.type) && typeof e.touches[0] === 'object'
    ? e.touches[0]
    : e;

export default e => {
  const a = mouseOrTouch(e);

  return [a.clientX || 0, a.clientY || 0];
};
