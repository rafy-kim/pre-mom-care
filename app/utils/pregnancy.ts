/**
 * 임신 주차 계산 유틸리티
 * 출산 예정일을 기준으로 현재 임신 주차를 계산합니다.
 */

/**
 * 출산 예정일을 기준으로 현재 임신 주차를 계산합니다.
 * 
 * @param dueDate - 출산 예정일 (string 또는 Date 객체)
 * @param currentDate - 기준 날짜 (optional, 기본값: 오늘)
 * @returns 현재 임신 주차 (1-40) 또는 null
 */
export function calculatePregnancyWeek(
  dueDate: string | Date | null | undefined,
  currentDate: Date = new Date()
): number | null {
  if (!dueDate) return null;

  try {
    // 임신 기간 상수 (280일 = 40주)
    const PREGNANCY_DURATION_DAYS = 280;
    const DAYS_IN_WEEK = 7;
    const MAX_WEEKS = 40;
    const MIN_WEEKS = 1;

    // Date 객체로 변환
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    
    // 유효한 날짜인지 확인
    if (isNaN(dueDateObj.getTime())) {
      console.error('Invalid due date:', dueDate);
      return null;
    }

    // 마지막 생리 시작일(LMP) 추정
    // 출산 예정일에서 280일을 뺀 날짜
    const lmpDate = new Date(dueDateObj);
    lmpDate.setDate(lmpDate.getDate() - PREGNANCY_DURATION_DAYS);

    // 현재 날짜와 LMP의 차이 계산 (일 단위)
    const diffInMs = currentDate.getTime() - lmpDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // 임신 전인 경우
    if (diffInDays < 0) {
      return MIN_WEEKS;
    }

    // 주차 계산 (1주차부터 시작)
    const currentWeek = Math.floor(diffInDays / DAYS_IN_WEEK) + 1;

    // 40주 초과 시 40주로 제한
    return Math.min(currentWeek, MAX_WEEKS);
  } catch (error) {
    console.error('Error calculating pregnancy week:', error);
    return null;
  }
}

/**
 * 임신 주차에 따른 삼분기(trimester) 정보를 반환합니다.
 * 
 * @param week - 임신 주차
 * @returns 삼분기 정보 (1, 2, 3) 또는 null
 */
export function getTrimester(week: number | null): number | null {
  if (!week || week < 1 || week > 40) return null;
  
  if (week <= 12) return 1;
  if (week <= 27) return 2;
  return 3;
}

/**
 * 임신 주차를 한국어로 포맷팅합니다.
 * 
 * @param week - 임신 주차
 * @returns 포맷팅된 문자열 (예: "임신 12주차")
 */
export function formatPregnancyWeek(week: number | null): string {
  if (!week) return '임신 주차 정보 없음';
  return `임신 ${week}주차`;
}

/**
 * 출산 예정일까지 남은 일수를 계산합니다.
 * 
 * @param dueDate - 출산 예정일
 * @param currentDate - 기준 날짜 (optional, 기본값: 오늘)
 * @returns 남은 일수 또는 null
 */
export function getDaysUntilDue(
  dueDate: string | Date | null | undefined,
  currentDate: Date = new Date()
): number | null {
  if (!dueDate) return null;

  try {
    const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    
    if (isNaN(dueDateObj.getTime())) {
      return null;
    }

    const diffInMs = dueDateObj.getTime() - currentDate.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    return diffInDays;
  } catch (error) {
    console.error('Error calculating days until due:', error);
    return null;
  }
}

/**
 * 임신 진행률을 백분율로 계산합니다.
 * 
 * @param week - 현재 임신 주차
 * @returns 진행률 (0-100) 또는 null
 */
export function getPregnancyProgress(week: number | null): number | null {
  if (!week || week < 1) return 0;
  if (week >= 40) return 100;
  
  return Math.round((week / 40) * 100);
}