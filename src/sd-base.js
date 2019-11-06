class SDBaseElement extends HTMLElement {
  setup(sd) {
    this._sd = sd;

    if (typeof this.init === 'function') this.init();
  }
}

export default SDBaseElement;
