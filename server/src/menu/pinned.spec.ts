import { describe, expect, it } from 'vitest';
import { mergePinned, mergePinnedIntoDayMenu } from './pinned';

describe('mergePinned', () => {
  it('nối món pinned vào cuối, giữ thứ tự món admin đăng', () => {
    expect(mergePinned(['a', 'b'], ['p1', 'p2'])).toEqual(['a', 'b', 'p1', 'p2']);
  });

  it('không nhân đôi món vừa pinned vừa được admin đăng', () => {
    expect(mergePinned(['a', 'p1'], ['p1', 'p2'])).toEqual(['a', 'p1', 'p2']);
  });

  it('không có món pinned thì giữ nguyên', () => {
    expect(mergePinned(['a', 'b'], [])).toEqual(['a', 'b']);
  });
});

describe('mergePinnedIntoDayMenu', () => {
  it('gộp vào mọi ngày đã đăng thực đơn', () => {
    expect(mergePinnedIntoDayMenu({ mon: ['a'], tue: ['b'] }, ['p'])).toEqual({
      mon: ['a', 'p'],
      tue: ['b', 'p'],
    });
  });

  it('KHÔNG mở ngày chưa đăng thực đơn (mảng rỗng vẫn rỗng)', () => {
    expect(mergePinnedIntoDayMenu({ mon: [], tue: ['b'] }, ['p'])).toEqual({ mon: [], tue: ['b', 'p'] });
  });

  it('dayMenu null → object rỗng, không tự sinh ngày', () => {
    expect(mergePinnedIntoDayMenu(null, ['p'])).toEqual({});
  });
});
