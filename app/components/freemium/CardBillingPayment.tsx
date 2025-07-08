import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { X, CreditCard, Shield, CheckCircle, AlertCircle } from "lucide-react";
import type { 
  ICardBillingPaymentProps, 
  ICardBillingUIState, 
  ICardForm, 
  ICardFormValidation,
  CardCompany 
} from "../../../types/index";

// 카드 번호 포맷팅 함수 (4자리씩 공백으로 구분)
const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
  const match = cleaned.match(/.{1,4}/g);
  return match ? match.join(' ') : '';
};

// 카드사 감지 함수 (정확한 BIN 범위 기반)
const detectCardCompany = (cardNumber: string): CardCompany => {
  const number = cardNumber.replace(/\s/g, '');
  
  if (number.length < 4) return 'UNKNOWN';
  
  const firstFour = number.substring(0, 4);
  const firstSix = number.substring(0, 6);
  
  // Visa (4로 시작)
  if (number.startsWith('4')) {
    if (firstSix >= '424030' && firstSix <= '424039') return 'KAKAOBANK';
    if (firstSix >= '486490' && firstSix <= '486499') return 'KB';
    if (firstSix >= '400115' && firstSix <= '400124') return 'NH';
    if (firstSix >= '448125' && firstSix <= '448134') return 'SHINHAN';
    return 'BC'; // 기본 Visa는 BC카드
  }
  
  // Mastercard (5로 시작)
  if (number.startsWith('5')) {
    if (firstSix >= '515594' && firstSix <= '515599') return 'KAKAOBANK';
    if (firstSix >= '540926' && firstSix <= '540935') return 'KB';
    if (firstSix >= '524353' && firstSix <= '524362') return 'NH';
    if (firstSix >= '544210' && firstSix <= '544219') return 'SHINHAN';
    return 'BC'; // 기본 Mastercard는 BC카드
  }
  
  // American Express (3으로 시작)
  if (number.startsWith('37') || number.startsWith('34')) {
    return 'SHINHAN'; // 국내 AMEX는 주로 신한카드
  }
  
  // JCB (35로 시작)
  if (number.startsWith('35')) {
    return 'BC'; // 국내 JCB는 주로 BC카드
  }
  
  // 카카오뱅크 (9로 시작하는 일부)
  if (number.startsWith('9')) {
    return 'KAKAOBANK';
  }
  
  return 'UNKNOWN';
};

// 카드사명 변환 함수
const getCardCompanyDisplayName = (company: CardCompany): string => {
  const displayNames: Record<CardCompany, string> = {
    'HYUNDAI': '현대카드',
    'SAMSUNG': '삼성카드',
    'SHINHAN': '신한카드',
    'KB': 'KB국민카드',
    'BC': 'BC카드',
    'HANA': '하나카드',
    'LOTTE': '롯데카드',
    'WOORI': '우리카드',
    'NH': 'NH농협카드',
    'CITI': '씨티카드',
    'KAKAOBANK': '카카오뱅크',
    'TOSSBANK': '토스뱅크',
    'UNKNOWN': '카드사'
  };
  return displayNames[company];
};

// 카드 정보 검증 함수
const validateCardForm = (form: ICardForm): ICardFormValidation => {
  const errors: ICardFormValidation = {};

  // 카드번호 검증
  const cardNumber = form.cardNumber.replace(/\s/g, '');
  if (!cardNumber) {
    errors.cardNumber = '카드번호를 입력해주세요.';
  } else if (cardNumber.length < 15 || cardNumber.length > 16) {
    errors.cardNumber = '올바른 카드번호를 입력해주세요.';
  }

  // 유효기간 검증
  if (!form.expiryMonth) {
    errors.expiryMonth = '월을 선택해주세요.';
  }
  if (!form.expiryYear) {
    errors.expiryYear = '년도를 선택해주세요.';
  }

  // 카드소유자명 검증
  if (!form.cardholderName.trim()) {
    errors.cardholderName = '카드소유자명을 입력해주세요.';
  }

  // 생년월일/사업자번호 검증
  if (!form.birthOrBusinessNumber) {
    errors.birthOrBusinessNumber = '생년월일 또는 사업자번호를 입력해주세요.';
  } else if (!/^(\d{6}|\d{10})$/.test(form.birthOrBusinessNumber)) {
    errors.birthOrBusinessNumber = '생년월일 6자리 또는 사업자번호 10자리를 입력해주세요.';
  }

  // 비밀번호 앞 2자리 검증
  if (!form.passwordTwoDigits) {
    errors.passwordTwoDigits = '비밀번호 앞 2자리를 입력해주세요.';
  } else if (!/^\d{2}$/.test(form.passwordTwoDigits)) {
    errors.passwordTwoDigits = '숫자 2자리를 입력해주세요.';
  }

  return errors;
};

export default function CardBillingPayment({ 
  isOpen, 
  onClose, 
  onLogin, 
  onPaymentSuccess 
}: ICardBillingPaymentProps) {
  const [uiState, setUiState] = useState<ICardBillingUIState>({
    currentStep: 'card-input',
    cardForm: {
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cardholderName: '',
      birthOrBusinessNumber: '',
      passwordTwoDigits: ''
    },
    validationErrors: {},
    isLoading: false,
    isProcessingPayment: false
  });

  // 단계별 진행률 계산
  const getProgress = () => {
    switch (uiState.currentStep) {
      case 'card-input': return 25;
      case 'billing-issue': return 50;
      case 'payment-process': return 75;
      case 'complete': return 100;
      default: return 0;
    }
  };

  // 연도 옵션 생성 (현재년도부터 +10년)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 10; i++) {
      const year = currentYear + i;
      years.push(year.toString().slice(-2)); // 마지막 2자리만
    }
    return years;
  };

  // 월 옵션 생성
  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = (i + 1).toString().padStart(2, '0');
      return month;
    });
  };

  // 입력 값 변경 핸들러
  const handleInputChange = useCallback((field: keyof ICardForm, value: string) => {
    setUiState((prev: ICardBillingUIState) => ({
      ...prev,
      cardForm: {
        ...prev.cardForm,
        [field]: field === 'cardNumber' ? formatCardNumber(value) : value
      },
      validationErrors: {
        ...prev.validationErrors,
        [field]: undefined // 입력 시 에러 메시지 제거
      }
    }));
  }, []);

  // 카드 정보 제출
  const handleSubmitCardInfo = async () => {
    const errors = validateCardForm(uiState.cardForm);
    
    if (Object.keys(errors).length > 0) {
      setUiState((prev: ICardBillingUIState) => ({
        ...prev,
        validationErrors: errors
      }));
      return;
    }

    setUiState((prev: ICardBillingUIState) => ({ ...prev, isLoading: true, currentStep: 'billing-issue' }));

    try {
      const response = await fetch('/api/payment/card-billing-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardForm: uiState.cardForm
        })
      });

      const result = await response.json();

      if (result.success) {
        setUiState((prev: ICardBillingUIState) => ({
          ...prev,
          billingKeyInfo: result.data,
          currentStep: 'payment-process'
        }));

        // 첫 번째 결제 처리
        await processFirstPayment(result.data.billingKey);
      } else {
        throw new Error(result.error || '빌링키 발급에 실패했습니다.');
      }
    } catch (error) {
      setUiState((prev: ICardBillingUIState) => ({
        ...prev,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        currentStep: 'card-input'
      }));
    } finally {
      setUiState((prev: ICardBillingUIState) => ({ ...prev, isLoading: false }));
    }
  };

  // 첫 번째 결제 처리
  const processFirstPayment = async (billingKey: string) => {
    setUiState((prev: ICardBillingUIState) => ({ ...prev, isProcessingPayment: true }));

    try {
      const response = await fetch('/api/payment/card-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingKey,
          planId: 'premium-monthly' // 데이터베이스 ID와 일치
        })
      });

      const result = await response.json();

      if (result.success) {
        setUiState((prev: ICardBillingUIState) => ({ ...prev, currentStep: 'complete' }));
        setTimeout(() => {
          onPaymentSuccess?.();
          onClose();
        }, 2000);
      } else {
        throw new Error(result.error || '결제에 실패했습니다.');
      }
    } catch (error) {
      setUiState((prev: ICardBillingUIState) => ({
        ...prev,
        error: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.',
        currentStep: 'billing-issue'
      }));
    } finally {
      setUiState((prev: ICardBillingUIState) => ({ ...prev, isProcessingPayment: false }));
    }
  };

  // 모달 닫기
  const handleClose = () => {
    if (!uiState.isLoading && !uiState.isProcessingPayment) {
      setUiState({
        currentStep: 'card-input',
        cardForm: {
          cardNumber: '',
          expiryMonth: '',
          expiryYear: '',
          cardholderName: '',
          birthOrBusinessNumber: '',
          passwordTwoDigits: ''
        },
        validationErrors: {},
        isLoading: false,
        isProcessingPayment: false
      });
      onClose();
    }
  };

  // 감지된 카드사
  const detectedCardCompany = detectCardCompany(uiState.cardForm.cardNumber);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] p-0">
        <div className="p-6 max-h-[calc(90vh-1rem)] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                프리미엄 정기 결제
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={uiState.isLoading || uiState.isProcessingPayment}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 진행률 표시 - 더 컴팩트하게 */}
            <div className="space-y-1">
              <Progress value={getProgress()} className="h-1.5" />
              <div className="text-xs text-gray-500 text-right">{getProgress()}% 완료</div>
            </div>
          </DialogHeader>

          {/* 카드 정보 입력 단계 */}
          {uiState.currentStep === 'card-input' && (
            <div className="space-y-4 mt-5">
              {/* 미니 카드 시각화 - 더 컴팩트하게 */}
              <Card className="relative bg-gradient-to-r from-slate-800 to-slate-700 text-white overflow-hidden h-20">
                <CardContent className="p-4 h-full flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-mono tracking-wider">
                      {uiState.cardForm.cardNumber || '**** **** **** ****'}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {uiState.cardForm.cardholderName || 'CARDHOLDER NAME'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-75">
                      {uiState.cardForm.expiryMonth && uiState.cardForm.expiryYear 
                        ? `${uiState.cardForm.expiryMonth}/${uiState.cardForm.expiryYear}`
                        : 'MM/YY'
                      }
                    </div>
                    <div className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded mt-1">
                      {getCardCompanyDisplayName(detectedCardCompany)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 입력 폼 - 2열 그리드로 효율적 배치 */}
              <div className="space-y-4">
                {/* 카드번호 - 전체 폭 */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber" className="text-sm font-medium">카드번호</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={uiState.cardForm.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    maxLength={19}
                    className={`h-11 ${uiState.validationErrors.cardNumber ? 'border-red-500' : ''}`}
                  />
                  {uiState.validationErrors.cardNumber && (
                    <p className="text-xs text-red-500">{uiState.validationErrors.cardNumber}</p>
                  )}
                </div>

                {/* 유효기간과 카드소유자명을 한 줄에 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="expiryMonth" className="text-sm font-medium">월</Label>
                    <select
                      id="expiryMonth"
                      value={uiState.cardForm.expiryMonth}
                      onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                      className={`w-full h-11 px-3 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                        uiState.validationErrors.expiryMonth ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <option value="">월</option>
                      {getMonthOptions().map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    {uiState.validationErrors.expiryMonth && (
                      <p className="text-xs text-red-500">{uiState.validationErrors.expiryMonth}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="expiryYear" className="text-sm font-medium">년</Label>
                    <select
                      id="expiryYear"
                      value={uiState.cardForm.expiryYear}
                      onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                      className={`w-full h-11 px-3 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                        uiState.validationErrors.expiryYear ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <option value="">년</option>
                      {getYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    {uiState.validationErrors.expiryYear && (
                      <p className="text-xs text-red-500">{uiState.validationErrors.expiryYear}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cardholderName" className="text-sm font-medium">카드소유자명</Label>
                    <Input
                      id="cardholderName"
                      type="text"
                      placeholder="홍길동"
                      value={uiState.cardForm.cardholderName}
                      onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                      className={`h-11 ${uiState.validationErrors.cardholderName ? 'border-red-500' : ''}`}
                    />
                    {uiState.validationErrors.cardholderName && (
                      <p className="text-xs text-red-500">{uiState.validationErrors.cardholderName}</p>
                    )}
                  </div>
                </div>

                {/* 생년월일과 비밀번호를 한 줄에 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="birthOrBusinessNumber" className="text-sm font-medium">생년월일(6자리) 또는 사업자번호(10자리)</Label>
                    <Input
                      id="birthOrBusinessNumber"
                      type="text"
                      placeholder="940815 또는 1234567890"
                      value={uiState.cardForm.birthOrBusinessNumber}
                      onChange={(e) => handleInputChange('birthOrBusinessNumber', e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={10}
                      className={`h-11 ${uiState.validationErrors.birthOrBusinessNumber ? 'border-red-500' : ''}`}
                    />
                    {uiState.validationErrors.birthOrBusinessNumber && (
                      <p className="text-xs text-red-500">{uiState.validationErrors.birthOrBusinessNumber}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="passwordTwoDigits" className="text-sm font-medium">비밀번호 앞 2자리</Label>
                    <Input
                      id="passwordTwoDigits"
                      type="password"
                      placeholder="**"
                      value={uiState.cardForm.passwordTwoDigits}
                      onChange={(e) => handleInputChange('passwordTwoDigits', e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={2}
                      className={`h-11 text-center ${uiState.validationErrors.passwordTwoDigits ? 'border-red-500' : ''}`}
                    />
                    {uiState.validationErrors.passwordTwoDigits && (
                      <p className="text-xs text-red-500">{uiState.validationErrors.passwordTwoDigits}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 보안 정보 - 더 컴팩트하게 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">보안 안내</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  카드 정보는 포트원 보안 서버를 통해 안전하게 처리되며, 당사 서버에는 저장되지 않습니다.
                </p>
              </div>

              {/* 에러 메시지 */}
              {uiState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">오류</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{uiState.error}</p>
                </div>
              )}

              {/* 액션 버튼 */}
              <Button
                onClick={handleSubmitCardInfo}
                disabled={uiState.isLoading}
                className="w-full h-11 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {uiState.isLoading ? '처리 중...' : '정기결제 등록하기'}
              </Button>
            </div>
          )}

          {/* 빌링키 발급 중 */}
          {uiState.currentStep === 'billing-issue' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <h3 className="text-base font-semibold">빌링키 발급 중</h3>
              <p className="text-sm text-gray-600 text-center">
                안전한 정기결제를 위한 빌링키를 발급하고 있습니다.
              </p>
            </div>
          )}

          {/* 첫 결제 처리 중 */}
          {uiState.currentStep === 'payment-process' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
              <h3 className="text-base font-semibold">첫 결제 처리 중</h3>
              <p className="text-sm text-gray-600 text-center">
                프리미엄 서비스 첫 결제를 처리하고 있습니다.
              </p>
            </div>
          )}

          {/* 완료 */}
          {uiState.currentStep === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <h3 className="text-base font-semibold text-green-800">결제 완료!</h3>
              <p className="text-sm text-gray-600 text-center">
                프리미엄 서비스가 성공적으로 등록되었습니다.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 