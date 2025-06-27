"use client";

import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "~/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { IUserProfile } from "types";

// Remix loader에서 반환된 사용자 프로필 (Date가 string으로 직렬화됨)
interface ISerializedUserProfile extends Omit<IUserProfile, 'dueDate' | 'createdAt' | 'updatedAt'> {
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface IOnboardingEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: ISerializedUserProfile;
  onSuccess?: () => void;
}

export function OnboardingEditModal({ 
  isOpen, 
  onOpenChange, 
  userProfile,
  onSuccess 
}: IOnboardingEditModalProps) {
  const fetcher = useFetcher();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [relation, setRelation] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 사용자 프로필 정보를 기본값으로 설정
  useEffect(() => {
    if (userProfile) {
      setNickname(userProfile.baby_nickname);
      setDueDate(new Date(userProfile.dueDate)); // string을 Date로 변환
      setGender(userProfile.gender);
      setRelation(userProfile.relation);
    }
  }, [userProfile]);

  // 폼 완성 여부 체크
  const isFormComplete = dueDate && gender && relation && nickname.trim();

  // 제출 상태 추적 및 모달 닫기
  useEffect(() => {
    if (isSubmitting && fetcher.state === 'idle') {
      // 제출 중이었다가 idle로 돌아왔다면 완료된 것으로 간주
      setIsSubmitting(false);
      onOpenChange(false);
      onSuccess?.();
    }
  }, [fetcher.state, isSubmitting, onOpenChange, onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete || isSubmitting) return;

    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('baby_nickname', nickname);
    formData.append('dueDate', format(dueDate!, 'yyyy-MM-dd'));
    formData.append('gender', gender);
    formData.append('relation', relation);

    fetcher.submit(formData, {
      method: 'post',
      action: '/api/onboarding'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            아기 정보 수정
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">아기 태명</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 튼튼이"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dueDate">출산 예정일</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>날짜를 선택하세요</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  defaultMonth={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setDate(new Date().getDate() - 1)) || 
                    date > new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>아기 성별</Label>
            <ToggleGroup
              type="single"
              value={gender}
              onValueChange={(value) => {
                if (value) setGender(value);
              }}
              className="grid grid-cols-3"
            >
              <ToggleGroupItem value="boy">남아</ToggleGroupItem>
              <ToggleGroupItem value="girl">여아</ToggleGroupItem>
              <ToggleGroupItem value="unknown">아직 몰라요</ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <div className="space-y-2">
            <Label>나의 관계</Label>
            <ToggleGroup
              type="single"
              value={relation}
              onValueChange={(value) => {
                if (value) setRelation(value);
              }}
              className="grid grid-cols-2"
            >
              <ToggleGroupItem value="mother">엄마</ToggleGroupItem>
              <ToggleGroupItem value="father">아빠</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={!isFormComplete || isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 