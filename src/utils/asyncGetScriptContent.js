import asyncLoadTextFromUrl from './asyncLoadTextFromUrl.js';

export default async script => {
  if (script.src) {
    return asyncLoadTextFromUrl(script.src);
  }

  return script.text;
};
