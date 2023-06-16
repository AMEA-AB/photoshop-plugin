/* eslint-disable import/prefer-default-export */
const replaceAllInString = (input: string, search: string, replace: string) => input.split(search).join(replace);

export { replaceAllInString };
