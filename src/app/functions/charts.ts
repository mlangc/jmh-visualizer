export const tickFormatter = (tick: number) => {
  return String(shortenLargeNumber(tick, 20));
};

function shortenLargeNumber(num: number, digits: number) {
  var units = ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'],
    decimal: number;

  for (let i = units.length - 1; i >= 0; i--) {
    decimal = 1000 ** (i + 1);

    if (num <= -decimal || num >= decimal) {
      return +(num / decimal).toFixed(digits) + units[i];
    }
  }

  return num;
}
