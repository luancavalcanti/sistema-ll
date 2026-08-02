const rawDate = '2026-07-02 03:40:01.934091+00';
let safeDate = rawDate.replace(' ', 'T');
safeDate = safeDate.replace(/(\.\d{3})\d+/, '$1');
safeDate = safeDate.replace(/\+00$/, 'Z');
console.log('safeDate:', safeDate);
console.log('Date object:', new Date(safeDate));
