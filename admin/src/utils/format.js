import { parseDate } from './date.js';

function comma(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function fmtKRW(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}₩${comma(Math.abs(Math.round(n)))}`;
}

export function fmtDateKR(s) {
  const d = parseDate(s);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDateKRFull(s) {
  const d = parseDate(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
