import resolveToy from './resolveToy.js';

export default (uniforms, toy) =>
  Object.values(uniforms).reduce(
    (acc, u) =>
      acc +
      `uniform ${resolveToy(u, toy, 'type')} ${resolveToy(u, toy, 'name')};\n`,
    ''
  );
