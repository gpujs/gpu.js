import { utils } from './utils';

/**
 *
 * @param name
 * @param source
 * @returns {Function}
 */
export function alias(name, source) {
  const fnString = source.toString();
  return new Function(`return function ${name} (${utils.getArgumentNamesFromString(fnString).join(', ')}) {
  ${utils.getFunctionBodyFromString(fnString)}
}`)();
}
