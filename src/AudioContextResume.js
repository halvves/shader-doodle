class AudioContextResume {
  constructor(wa, el) {
    this._dragged = false;
    this._el = el;
    this._wa = wa;
    this._cbList = [];

    this._handleStart = this._handleStart.bind(this);
    this._handleDrag = this._handleDrag.bind(this);
    this._handleTap = this._handleTap.bind(this);
    this.onStart = this.onStart.bind(this);

    el.addEventListener('touchstart', this._handleTap);
    el.addEventListener('touchmove', this._handleDrag);
    el.addEventListener('touchend', this._handleTap);
    el.addEventListener('mouseup', this._handleTap);
  }

  onStart(cb) {
    if (this._wa.state === 'running') {
      console.log('already');
      cb();
    } else {
      this._cbList.push(cb);
    }
  }

  _handleDrag() {
    this._dragged = true;
  }

  _handleTap() {
    if (!this._dragged) {
      this._start();
    }
    this._dragged = false;
  }

  _handleStart() {
    this._cbList.forEach(cb => {
      cb();
    });
  }

  _start() {
    // ios shenanigans
    const s = this._wa.createBufferSource();
    s.buffer = this._wa.createBuffer(1, 1, this._wa.sampleRate);
    s.connect(this._wa.destination);
    s.start(0);

    // resume
    if (typeof this._wa.resume === 'function') {
      this._wa.resume().then(this._handleStart);
    }

    this._destroy();
  }

  _destroy() {
    this._el.removeEventListener('touchstart', this._handleTap);
    this._el.removeEventListener('touchmove', this._handleDrag);
    this._el.removeEventListener('touchend', this._handleTap);
    this._el.removeEventListener('mouseup', this._handleTap);
    this._el = null;
  }
}

export default AudioContextResume;
