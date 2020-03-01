function AudioContextResume(wa) {
  const dragged = new Set();
  const elements = new Set();
  const cbList = [];

  function onStart(cb) {
    if (wa.state === 'running') {
      console.log('already');
      cb();
    } else {
      cbList.push(cb);
    }
  }

  function handleDrag(e) {
    console.log(e);
    dragged.add(e.targetElement);
  }

  function handleTap(e) {
    if (!dragged.has(e.targetElement)) {
      start();
    } else {
      dragged.delete(e.targetElement);
    }
  }

  function handleStart() {
    cbList.forEach(cb => {
      cb();
    });
  }

  function start() {
    // ios shenanigans
    const s = wa.createBufferSource();
    s.buffer = wa.createBuffer(1, 1, wa.sampleRate);
    s.connect(wa.destination);
    s.start(0);

    // resume
    if (typeof wa.resume === 'function') {
      wa.resume().then(handleStart);
    }

    dispose();
  }

  function register(el) {
    el.addEventListener('touchstart', handleTap);
    el.addEventListener('touchmove', handleDrag);
    el.addEventListener('touchend', handleTap);
    el.addEventListener('mouseup', handleTap);
    elements.add(el);
  }

  function dispose() {
    elements.forEach(el => {
      el.removeEventListener('touchstart', handleTap);
      el.removeEventListener('touchmove', handleDrag);
      el.removeEventListener('touchend', handleTap);
      el.removeEventListener('mouseup', handleTap);
    });
    elements.clear();
    dragged.clear();
  }

  return {
    onStart,
    register,
    dispose,
  };
}

export default AudioContextResume;
