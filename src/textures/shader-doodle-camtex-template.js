export default {
  render() {
    return `${this.css()}
            ${this.html()}`;
  },

  map(scope) {
    return {
      video: scope.querySelector('video'),
    };
  },

  html(node) {
    return `<video autoplay></video>`;
  },

  css() {
    return `<style>
      :host {
        display: inline-block;
      }
      
      video {
        width: 640px;
        height: 480px;
      }
    </style>`;
  },
};
