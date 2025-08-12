"use client";

import { useState } from "react";
import { Form, useNavigate } from "@remix-run/react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { calculatePregnancyWeek, formatPregnancyWeek, getDaysUntilDue } from "~/utils/pregnancy";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function OnboardingForm() {
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [relation, setRelation] = useState("");
  
  // All fields except nickname are derived from state
  const isFormComplete = dueDate && gender && relation;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          더 정확한 맞춤 답변을 위해
          <br />
          아기에 대해 알려주세요!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" action="/api/onboarding" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nickname">아기 태명</Label>
            <Input
              id="nickname"
              name="baby_nickname"
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
                  onSelect={(date) => {
                    setDueDate(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setDate(new Date().getDate() - 1)) || date > new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <div className="text-sm text-muted-foreground mt-2">
                <div>{formatPregnancyWeek(calculatePregnancyWeek(dueDate))}</div>
                <div>D-{getDaysUntilDue(dueDate) ?? 0}</div>
              </div>
            )}
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
          
          {/* Hidden fields to submit state values */}
          {dueDate && <input type="hidden" name="dueDate" value={format(dueDate, "yyyy-MM-dd")} />}
          {gender && <input type="hidden" name="gender" value={gender} />}
          {relation && <input type="hidden" name="relation" value={relation} />}

          <Button type="submit" className="w-full" disabled={!isFormComplete}>
            완료
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
} 