export default (uniform, toy, prop) => {
  if (!toy) return uniform[prop];

  const toyprop = `toy${prop}`;
  if (uniform.hasOwnProperty(toyprop)) {
    return uniform[toyprop];
  }

  return uniform[prop];
};
