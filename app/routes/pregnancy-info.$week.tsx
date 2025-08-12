import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link, useParams, useNavigate } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { db, userProfiles, pregnancyInfo } from "~/db";
import { eq, sql } from "drizzle-orm";
import { calculatePregnancyWeek } from "~/utils/pregnancy";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Baby, 
  Calendar, 
  BookOpen, 
  Heart,
  Sparkles,
  TrendingUp,
  Info,
  ChevronLeft,
  ChevronRight,
  Scale,
  Ruler,
  Share2,
  Copy,
  Check
} from "lucide-react";
import { cn } from "~/lib/utils";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { useState, useEffect } from "react";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);
  const week = parseInt(args.params.week || "1");
  
  if (isNaN(week) || week < 1 || week > 40) {
    throw new Response("Invalid week", { status: 404 });
  }
  
  let currentWeek: number | null = null;
  let userProfile = null;
  
  if (userId) {
    userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });
    
    if (userProfile?.dueDate) {
      currentWeek = calculatePregnancyWeek(userProfile.dueDate);
    }
  }
  
  // 해당 주차 정보 가져오기
  const weekInfo = await db.query.pregnancyInfo.findFirst({
    where: eq(pregnancyInfo.week, week),
  });
  
  // 모든 주차의 성장 데이터 가져오기 (차트용)
  const allWeeksData = await db
    .select({
      week: pregnancyInfo.week,
      lengthMin: pregnancyInfo.fetusLengthCmMin,
      lengthMax: pregnancyInfo.fetusLengthCmMax,
      weightMin: pregnancyInfo.fetusWeightGMin,
      weightMax: pregnancyInfo.fetusWeightGMax,
    })
    .from(pregnancyInfo)
    .orderBy(pregnancyInfo.week);
  
  return json({ 
    week,
    weekInfo,
    currentWeek,
    userProfile: userProfile ? {
      babyNickname: userProfile.babyNickname,
      dueDate: userProfile.dueDate,
    } : null,
    hasNext: week < 40,
    hasPrev: week > 1,
    allWeeksData,
  });
};

// 크기 비교 아이콘 매핑
const getSizeIcon = (sizeComparison: string | null) => {
  if (!sizeComparison) return "🌱";
  
  const sizeIcons: Record<string, string> = {
    "양귀비씨": "🌰",
    "참깨": "⚫",
    "쌀알": "🌾",
    "팥": "🫘",
    "블루베리": "🫐",
    "체리": "🍒",
    "딸기": "🍓",
    "라임": "🍋",
    "레몬": "🍋",
    "오렌지": "🍊",
    "자몽": "🍊",
    "망고": "🥭",
    "파인애플": "🍍",
    "양배추": "🥬",
    "수박": "🍉",
    "호박": "🎃",
  };
  
  for (const [key, icon] of Object.entries(sizeIcons)) {
    if (sizeComparison.includes(key)) return icon;
  }
  
  return "🌱";
};

export default function PregnancyInfoDetail() {
  const { week, weekInfo, currentWeek, userProfile, hasNext, hasPrev, allWeeksData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState(week);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  useEffect(() => {
    setSelectedWeek(week);
  }, [week]);
  
  const getTrimester = (week: number) => {
    if (week <= 12) return { num: 1, name: "임신 초기", color: "from-pink-400 to-purple-400" };
    if (week <= 27) return { num: 2, name: "임신 중기", color: "from-purple-400 to-blue-400" };
    return { num: 3, name: "임신 말기", color: "from-blue-400 to-teal-400" };
  };
  
  const trimester = getTrimester(week);
  const isCurrentWeek = week === currentWeek;
  
  // 차트 데이터 준비
  const lengthChartData = allWeeksData.map(w => ({
    week: w.week,
    length: w.lengthMax ? parseFloat(w.lengthMax) : 0,
    current: w.week === week,
  }));
  
  const weightChartData = allWeeksData.map(w => ({
    week: w.week,
    weight: w.weightMax ? parseFloat(w.weightMax) : 0,
    current: w.week === week,
  }));
  
  // 슬라이더 값 변경 핸들러
  const handleWeekChange = (newWeek: number) => {
    setSelectedWeek(newWeek);
    navigate(`/pregnancy-info/${newWeek}`);
  };
  
  // 진행률 계산
  const progressPercentage = (week / 40) * 100;
  
  // 공유 기능
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${week}주차 임신 정보`;
    const shareText = weekInfo?.title 
      ? `${week}주차: ${weekInfo.title}\n\n${userProfile?.babyNickname ? `${userProfile.babyNickname}와 함께하는 ` : ''}임신 ${week}주차 정보를 확인해보세요!\n\n`
      : `임신 ${week}주차 정보를 확인해보세요!\n\n`;
    
    setIsSharing(true);
    
    // 네이티브 공유 API 지원 확인
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // 사용자가 공유를 취소한 경우
        console.log('Share cancelled');
      }
    } else {
      // 네이티브 공유 API를 지원하지 않는 경우 - 링크 복사
      await copyToClipboard(`${shareText}${shareUrl}`);
    }
    
    setIsSharing(false);
  };
  
  // 클립보드에 복사
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // 폴백: 구식 방법 사용
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/chat">
                <Button variant="ghost" size="sm" className="hover:bg-teal-50">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  채팅으로
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="hover:bg-purple-50"
                onClick={handleShare}
                disabled={isSharing}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    복사됨!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    공유하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={week}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 타이틀 섹션 */}
            <div className="text-center mb-8">
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent mb-2"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {week}주차, {weekInfo?.title || `임신 ${week}주차`}
              </motion.h1>
              <p className="text-gray-600">
                슬라이더를 움직여 각 주차별 상세 정보를 확인해보세요.
              </p>
            </div>
            
            {/* 주차 선택 슬라이더 */}
            <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">주차 선택:</span>
                  <Badge className={cn("bg-gradient-to-r text-white", trimester.color)}>
                    {trimester.name}
                  </Badge>
                </div>
                
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleWeekChange(Math.max(1, week - 1))}
                      disabled={!hasPrev}
                      className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    <div className="flex-1">
                      <input
                        type="range"
                        min="1"
                        max="40"
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                        onMouseUp={() => handleWeekChange(selectedWeek)}
                        onTouchEnd={() => handleWeekChange(selectedWeek)}
                        className="w-full h-2 bg-gradient-to-r from-pink-200 via-purple-200 to-teal-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, 
                            rgb(147 197 253) 0%, 
                            rgb(147 197 253) ${progressPercentage}%, 
                            rgb(229 231 235) ${progressPercentage}%, 
                            rgb(229 231 235) 100%)`
                        }}
                      />
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-500">1주</span>
                        <span className="text-lg font-bold text-teal-600">{week}주차</span>
                        <span className="text-xs text-gray-500">40주</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleWeekChange(Math.min(40, week + 1))}
                      disabled={!hasNext}
                      className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {isCurrentWeek && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-pink-500 text-white animate-bounce">
                        현재 주차
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* 메인 정보 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 임신 준비 단계 카드 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="h-full bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-pink-500" />
                      {week}주차 상세 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {weekInfo && (
                      <>
                        {/* 아기 크기 비교 */}
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{getSizeIcon(weekInfo.sizeComparison)}</div>
                          <div>
                            <p className="text-sm text-gray-600">아기 크기 비교</p>
                            <p className="font-bold text-lg">{weekInfo.sizeComparison || "정보 준비 중"}</p>
                          </div>
                        </div>
                        
                        {/* 산모의 변화 */}
                        {weekInfo.motherChanges && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Heart className="h-4 w-4 text-red-500" />
                              <h4 className="font-semibold">산모의 변화</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {weekInfo.motherChanges}
                            </p>
                          </div>
                        )}
                        
                        {/* 태아의 성장 */}
                        {weekInfo.fetusGrowth && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Baby className="h-4 w-4 text-blue-500" />
                              <h4 className="font-semibold">태아의 성장</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {weekInfo.fetusGrowth}
                            </p>
                          </div>
                        )}
                        
                        {/* 실생활 팁 */}
                        {weekInfo.tips && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Info className="h-4 w-4 text-green-500" />
                              <h4 className="font-semibold">실생활 팁</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {weekInfo.tips}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* 태아 성장 그래프 카드 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="h-full bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      태아 성장 그래프
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* 크기 그래프 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Ruler className="h-4 w-4 text-teal-600" />
                        <h4 className="font-medium text-sm">태아 크기 (cm)</h4>
                        {weekInfo?.fetusLengthCmMax && (
                          <Badge variant="outline" className="ml-auto">
                            현재: {parseFloat(weekInfo.fetusLengthCmMax).toFixed(1)}cm
                          </Badge>
                        )}
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={lengthChartData}>
                          <defs>
                            <linearGradient id="colorLength" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="week" 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => value % 5 === 0 ? `${value}주` : ''}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            domain={[0, 'dataMax + 5']}
                          />
                          <Tooltip 
                            formatter={(value: any) => `${value.toFixed(1)}cm`}
                            labelFormatter={(label) => `${label}주차`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="length" 
                            stroke="#14b8a6" 
                            strokeWidth={2}
                            fill="url(#colorLength)"
                          />
                          {week && (
                            <ReferenceLine 
                              x={week} 
                              stroke="#ef4444" 
                              strokeDasharray="5 5"
                              strokeWidth={2}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* 무게 그래프 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-sm">태아 몸무게 (g)</h4>
                        {weekInfo?.fetusWeightGMax && (
                          <Badge variant="outline" className="ml-auto">
                            현재: {parseFloat(weekInfo.fetusWeightGMax).toFixed(0)}g
                          </Badge>
                        )}
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={weightChartData}>
                          <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#fb923c" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="week" 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => value % 5 === 0 ? `${value}주` : ''}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            domain={[0, 'dataMax + 100']}
                          />
                          <Tooltip 
                            formatter={(value: any) => `${value.toFixed(0)}g`}
                            labelFormatter={(label) => `${label}주차`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="weight" 
                            stroke="#fb923c" 
                            strokeWidth={2}
                            fill="url(#colorWeight)"
                          />
                          {week && (
                            <ReferenceLine 
                              x={week} 
                              stroke="#ef4444" 
                              strokeDasharray="5 5"
                              strokeWidth={2}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            
            {/* 전문가 코멘트 */}
            {weekInfo?.expertComment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      전문가 코멘트
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">
                      {weekInfo.expertComment}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {/* 하단 네비게이션 */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {hasPrev ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to={`/pregnancy-info/${week - 1}`}>
                    <Card className="hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">이전</p>
                            <p className="font-medium">{week - 1}주차</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ) : (
                <div />
              )}
              
              {hasNext ? (
                <motion.div 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  className={!hasPrev ? "col-start-2" : ""}
                >
                  <Link to={`/pregnancy-info/${week + 1}`}>
                    <Card className="hover:bg-gray-50 transition-colors cursor-pointer border-0 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">다음</p>
                            <p className="font-medium">{week + 1}주차</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ) : (
                <div />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        
        .slider:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}