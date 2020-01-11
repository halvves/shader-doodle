export default (base, ...methods) => {
  Array.isArray(methods) &&
    methods.forEach(m => (base[m] = base[m].bind(base)));
};
