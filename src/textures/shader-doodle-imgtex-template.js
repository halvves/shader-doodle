export default {
  render() {
    return `${this.css()}
            ${this.html()}`;
  },

  map(scope) {
    return {
      img: scope.querySelector('img'),
    };
  },

  html(node) {
    return `<img></img>`;
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
