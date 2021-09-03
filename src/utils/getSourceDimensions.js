export default function getSourceDimensions(source) {
  if (!source) return [0, 0];

  const tag = (source.tagName || '').toLowerCase();
  if (tag === 'video') return [source.videoWidth, source.videoHeight];
  if (tag === 'img') return [source.naturalWidth, source.naturalHeight];
  return [source.width, source.height];
}
