/**
 * 임신 주차 계산 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePregnancyWeek,
  getTrimester,
  formatPregnancyWeek,
  getDaysUntilDue,
  getPregnancyProgress
} from './pregnancy';

describe('calculatePregnancyWeek', () => {
  it('출산 예정일이 오늘인 경우 40주차를 반환해야 함', () => {
    const today = new Date('2024-03-01');
    const dueDate = new Date('2024-03-01');
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(40);
  });

  it('출산 예정일이 280일 뒤인 경우 1주차를 반환해야 함', () => {
    const today = new Date('2024-01-01');
    const dueDate = new Date('2024-10-07'); // 2024-01-01로부터 280일 후
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(1);
  });

  it('출산 예정일이 과거인 경우 40주차를 반환해야 함', () => {
    const today = new Date('2024-03-10');
    const dueDate = new Date('2024-03-01');
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(40);
  });

  it('출산 예정일이 입력되지 않은 경우 null을 반환해야 함', () => {
    expect(calculatePregnancyWeek(null)).toBeNull();
    expect(calculatePregnancyWeek(undefined)).toBeNull();
    expect(calculatePregnancyWeek('')).toBeNull();
  });

  it('예정일로부터 10주 전인 경우 31주차를 반환해야 함', () => {
    const today = new Date('2024-02-01');
    const dueDate = new Date('2024-04-11'); // 2024-02-01로부터 70일(10주) 후
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(31); // 280일 - 70일 = 210일, 210일 경과 = 30주 완료, 31주차 진행중
  });

  it('문자열 형식의 날짜도 올바르게 처리해야 함', () => {
    const today = new Date('2024-02-01');
    const dueDate = '2024-04-11';
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(31); // 위와 동일한 계산
  });

  it('임신 시작 전인 경우 1주차를 반환해야 함', () => {
    const today = new Date('2023-05-01');
    const dueDate = new Date('2024-03-01');
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(1);
  });

  it('잘못된 날짜 형식인 경우 null을 반환해야 함', () => {
    const week = calculatePregnancyWeek('invalid-date');
    expect(week).toBeNull();
  });

  it('20주차 정확히 계산되는지 확인', () => {
    const today = new Date('2024-01-01');
    const dueDate = new Date('2024-05-20'); // LMP: 2023-08-14, 140일 경과
    const week = calculatePregnancyWeek(dueDate, today);
    expect(week).toBe(21); // 140일 경과 = 20주 완료, 21주차 진행중
  });
});

describe('getTrimester', () => {
  it('1-12주는 1삼분기를 반환해야 함', () => {
    expect(getTrimester(1)).toBe(1);
    expect(getTrimester(6)).toBe(1);
    expect(getTrimester(12)).toBe(1);
  });

  it('13-27주는 2삼분기를 반환해야 함', () => {
    expect(getTrimester(13)).toBe(2);
    expect(getTrimester(20)).toBe(2);
    expect(getTrimester(27)).toBe(2);
  });

  it('28-40주는 3삼분기를 반환해야 함', () => {
    expect(getTrimester(28)).toBe(3);
    expect(getTrimester(35)).toBe(3);
    expect(getTrimester(40)).toBe(3);
  });

  it('유효하지 않은 주차는 null을 반환해야 함', () => {
    expect(getTrimester(null)).toBeNull();
    expect(getTrimester(0)).toBeNull();
    expect(getTrimester(41)).toBeNull();
    expect(getTrimester(-1)).toBeNull();
  });
});

describe('formatPregnancyWeek', () => {
  it('주차를 한국어로 포맷팅해야 함', () => {
    expect(formatPregnancyWeek(12)).toBe('임신 12주차');
    expect(formatPregnancyWeek(1)).toBe('임신 1주차');
    expect(formatPregnancyWeek(40)).toBe('임신 40주차');
  });

  it('null인 경우 기본 메시지를 반환해야 함', () => {
    expect(formatPregnancyWeek(null)).toBe('임신 주차 정보 없음');
  });
});

describe('getDaysUntilDue', () => {
  it('출산 예정일까지 남은 일수를 계산해야 함', () => {
    const today = new Date('2024-01-01');
    const dueDate = new Date('2024-01-11');
    const days = getDaysUntilDue(dueDate, today);
    expect(days).toBe(10);
  });

  it('출산 예정일이 지난 경우 음수를 반환해야 함', () => {
    const today = new Date('2024-01-11');
    const dueDate = new Date('2024-01-01');
    const days = getDaysUntilDue(dueDate, today);
    expect(days).toBe(-10);
  });

  it('출산 예정일이 오늘인 경우 0 또는 1을 반환해야 함', () => {
    const today = new Date('2024-01-01T12:00:00');
    const dueDate = new Date('2024-01-01T23:59:59'); // 같은 날이지만 더 늦은 시간
    const days = getDaysUntilDue(dueDate, today);
    expect(days).toBe(1); // ceil 함수로 인해 올림 처리됨
  });

  it('유효하지 않은 날짜는 null을 반환해야 함', () => {
    expect(getDaysUntilDue(null)).toBeNull();
    expect(getDaysUntilDue(undefined)).toBeNull();
    expect(getDaysUntilDue('invalid-date')).toBeNull();
  });
});

describe('getPregnancyProgress', () => {
  it('임신 진행률을 백분율로 계산해야 함', () => {
    expect(getPregnancyProgress(1)).toBe(3);   // 1/40 = 2.5% → 3%
    expect(getPregnancyProgress(10)).toBe(25); // 10/40 = 25%
    expect(getPregnancyProgress(20)).toBe(50); // 20/40 = 50%
    expect(getPregnancyProgress(30)).toBe(75); // 30/40 = 75%
    expect(getPregnancyProgress(40)).toBe(100); // 40/40 = 100%
  });

  it('40주 초과 시 100%를 반환해야 함', () => {
    expect(getPregnancyProgress(41)).toBe(100);
    expect(getPregnancyProgress(50)).toBe(100);
  });

  it('1주 미만이거나 null인 경우 0을 반환해야 함', () => {
    expect(getPregnancyProgress(0)).toBe(0);
    expect(getPregnancyProgress(-1)).toBe(0);
    expect(getPregnancyProgress(null)).toBe(0);
  });
});