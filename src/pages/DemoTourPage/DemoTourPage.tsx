import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Sparkles, Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePlan } from '@/context/PlanContext';
import { MOCK_POSITIONS, MOCK_PLAN_DATA } from '@/data/mockPlanData';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/format';

const DEMO_STEPS = [
  {
    id: 0,
    title: '欢迎来到演示样例',
    description: '我来带你快速走完一份人力规划方案的完整流程。每一步都会说明「这一步做什么」「你可以改哪里」，跟着走一遍就上手了。',
    tip: '全程大约需要 3 分钟。所有数字都是演示数据，可以随意修改。',
    highlight: null,
  },
  {
    id: 1,
    title: '第一步：设定目标与导入数据',
    description: '做规划从目标开始。这里填写年度营收目标，系统会用它倒推需要多少人。',
    tip: '试试把营收目标改成 1.5 亿，看看后面编制会怎么变化。点击「下一步」我们继续。',
    highlight: 'target',
  },
  {
    id: 2,
    title: 'Excel 导入：从模板开始',
    description: '数据导入只保留一种方式 —— 下载标准模板、填好上传、校验预览。',
    tip: '右边是上传后的预览表，会自动做字段校验，有问题直接提示第几行哪里错了。新手推荐先用「内置演示数据」快速开始。',
    highlight: 'import',
  },
  {
    id: 3,
    title: '第二步：编制测算',
    description: '这是核心页。左边是部门岗位树，右边是按月编制表，每个单元格都可以直接改。',
    tip: '注意看每个字段旁边的「测算方法」下拉 —— 选「按人均产值倒推」，数字自动就算好了，不用写任何公式。',
    highlight: 'headcount',
  },
  {
    id: 4,
    title: '编制红线：超标一眼看到',
    description: '右上角的红线提醒，编制超出目标时实时变红，差异百分比同步联动。',
    tip: '红线是根据你填的营收目标和人效基准自动算的，不用手动设数字。',
    highlight: 'redline',
  },
  {
    id: 5,
    title: '第三步：成本测算',
    description: '每个岗位都能展开看钱花在哪：固定工资、浮动、社保公积金、福利、专项，一清二楚。',
    tip: '右边的「参数设置」可以调到岗时间、调薪幅度、流动率，改完按月成本实时重算。',
    highlight: 'cost',
  },
  {
    id: 6,
    title: '第四步：沙盘试算',
    description: '这是最好玩的一步。拖动滑块调整营收目标、人效提升、调薪幅度，右边指标实时变化。',
    tip: '试试「乐观 / 中性 / 悲观」三个预设情景对比，觉得好可以「另存为新情景」。',
    highlight: 'sandbox',
  },
  {
    id: 7,
    title: '第五步：结果与报表',
    description: '方案做完了，关键指标一目了然。点「查看完整报告」进报表中心看图表。',
    tip: '报表中心里的图都能点 —— 点饼图扇区看明细、点柱状图下钻部门、折线图看单月数据。',
    highlight: 'results',
  },
  {
    id: 8,
    title: '恭喜你，全部看完了！',
    description: '现在你已经了解整个流程了。接下来可以用模板自己做一份，或者直接去工作台动手。',
    tip: '记住：从模板开始 → 填目标 → 调编制 → 看成本 → 玩沙盘 → 出报告，6 步搞定。',
    highlight: null,
    isFinal: true,
  },
];

export default function DemoTourPage() {
  const navigate = useNavigate();
  const { createPlan } = usePlan();
  const [currentStep, setCurrentStep] = useState(0);

  const step = DEMO_STEPS[currentStep];
  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  const handleStart = () => {
    // Create a demo plan and navigate to workbench
    createPlan('general', '演示样例方案');
    navigate('/workbench');
  };

  // Background preview content per step
  const PreviewContent = useMemo(() => {
    const positions = MOCK_POSITIONS.slice(0, 6);
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];

    switch (step.highlight) {
      case 'target':
        return (
          <div className="p-6 space-y-4">
            <div className="text-sm font-semibold text-foreground mb-2">年度业务目标</div>
            <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/30 ring-4 ring-primary/10">
              <label className="text-xs text-muted-foreground">年度营收目标（元）</label>
              <div className="text-2xl font-bold text-foreground tabular-nums mt-1">¥120,000,000</div>
            </div>
            <div className="grid grid-cols-2 gap-3 opacity-60">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">毛利目标</div>
                <div className="text-sm font-medium tabular-nums">¥48,000,000</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground">人效基准</div>
                <div className="text-sm font-medium tabular-nums">¥600,000/人</div>
              </div>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="p-6">
            <div className="text-sm font-semibold text-foreground mb-3">数据导入</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border-2 border-primary/30 ring-4 ring-primary/10 bg-primary/5">
                <div className="text-xs text-muted-foreground mb-1">上传文件</div>
                <div className="text-sm font-medium text-foreground truncate">人力编制数据.xlsx</div>
                <div className="text-xs text-primary mt-1">解析成功 · 22 条记录</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 opacity-60">
                <div className="text-xs text-muted-foreground mb-1">校验结果</div>
                <div className="text-sm font-medium">0 错误 · 0 警告</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <div className="text-xs bg-muted/30 px-3 py-1.5 font-medium text-muted-foreground">
                数据预览
              </div>
              <div className="text-xs">
                {positions.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center px-3 py-1.5 border-b border-border/50 last:border-0">
                    <span className="w-20 truncate text-muted-foreground">{p.department}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="w-12 text-right tabular-nums">{p.monthlyHeadcount[11]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'headcount':
        return (
          <div className="p-4">
            <div className="text-sm font-semibold text-foreground mb-2 ml-2">编制测算表</div>
            <div className="rounded-xl border-2 border-primary/30 ring-4 ring-primary/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left font-medium px-2 py-1.5 sticky left-0 bg-muted/40 z-10">岗位</th>
                      {months.map((m) => (
                        <th key={m} className="text-right font-medium px-2 py-1.5 whitespace-nowrap">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.slice(0, 4).map((p) => (
                      <tr key={p.id} className="border-t border-border/40">
                        <td className="px-2 py-1.5 sticky left-0 bg-background z-10 text-foreground font-medium">
                          {p.name}
                        </td>
                        {p.monthlyHeadcount.slice(0, 6).map((v, i) => (
                          <td key={i} className="px-2 py-1.5 text-right tabular-nums">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 ml-2">
              <Badge variant="outline" className="text-[10px]">测算方法</Badge>
              <span className="text-xs text-muted-foreground">按人均产值倒推</span>
            </div>
          </div>
        );

      case 'redline':
        return (
          <div className="p-6">
            <div className="text-sm font-semibold text-foreground mb-3">编制红线</div>
            <div className="p-4 rounded-xl border-2 border-destructive/40 ring-4 ring-destructive/10 bg-destructive/5">
              <div className="text-xs text-destructive/70 mb-1">当前编制 vs 红线</div>
              <div className="text-xl font-bold text-destructive tabular-nums">
                182 / 180 人
              </div>
              <div className="text-xs text-destructive mt-1">
                超出 2 人 · +1.1%
              </div>
              <div className="mt-2 h-2 rounded-full bg-destructive/20 overflow-hidden">
                <div className="h-full bg-destructive rounded-full" style={{ width: '95%' }} />
              </div>
            </div>
          </div>
        );

      case 'cost':
        return (
          <div className="p-6">
            <div className="text-sm font-semibold text-foreground mb-3">成本构成</div>
            <div className="space-y-2 rounded-xl border-2 border-primary/30 ring-4 ring-primary/10 p-3">
              {[
                { label: '固定工资', value: 18200000, pct: 55 },
                { label: '浮动工资', value: 5460000, pct: 16.5 },
                { label: '社保公积金', value: 5790000, pct: 17.5 },
                { label: '福利费用', value: 2200000, pct: 6.7 },
                { label: '专项费用', value: 1430000, pct: 4.3 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground shrink-0">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${item.pct * 1.5}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-20 text-right">¥{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right text-xs text-muted-foreground">
              合计 <span className="text-foreground font-medium tabular-nums">¥{formatCurrency(33080000)}</span>
            </div>
          </div>
        );

      case 'sandbox':
        return (
          <div className="p-6">
            <div className="text-sm font-semibold text-foreground mb-3">沙盘变量</div>
            <div className="space-y-4 rounded-xl border-2 border-primary/30 ring-4 ring-primary/10 p-4">
              {[
                { label: '营收目标', value: '¥120M' },
                { label: '人效提升', value: '+5%' },
                { label: '调薪幅度', value: '+5%' },
                { label: '配比系数', value: '1.00x' },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{item.label}</span>
                    <span className="text-xs font-medium tabular-nums">{item.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted relative">
                    <div className="absolute inset-y-0 left-0 w-1/2 bg-primary rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="p-6">
            <div className="text-sm font-semibold text-foreground mb-3">关键指标</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="text-xs text-muted-foreground">编制总数</div>
                <div className="text-lg font-bold tabular-nums">182 人</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="text-xs text-muted-foreground">成本预算</div>
                <div className="text-lg font-bold tabular-nums">¥3,308万</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="text-xs text-muted-foreground">人力成本率</div>
                <div className="text-lg font-bold tabular-nums">27.6%</div>
              </div>
              <div className="p-3 rounded-xl bg-accent/40 border border-accent">
                <div className="text-xs text-primary/70">人均产值</div>
                <div className="text-lg font-bold text-primary tabular-nums">¥65.9万</div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="size-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">人力规划与成本测算沙盘</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              用模板 3 步做出你的第一份方案
            </p>
          </div>
        );
    }
  }, [step]);

  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8">
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 text-muted-foreground text-sm hover:text-foreground hover:bg-background transition-colors"
      >
        <X className="size-4" />
        跳过演示
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-5xl"
      >
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-background/80 mb-1.5">
            <span>第 {currentStep + 1} 步 / 共 {DEMO_STEPS.length} 步</span>
            <span>{Math.round(progress)}% 完成</span>
          </div>
          <Progress value={progress} className="h-1 bg-background/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-6">
          {/* Left: Preview area */}
          <Card className="bg-background border-0 shadow-2xl overflow-hidden">
            <CardContent className="p-0 min-h-[420px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  {PreviewContent}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Right: Narration panel */}
          <div className="flex flex-col">
            <Card className="bg-background border-0 shadow-2xl flex-1 flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <Badge variant="outline" className="w-fit mb-3 text-xs">
                  <Play className="size-3 mr-1" />
                  演示样例
                </Badge>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`title-${currentStep}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl font-bold text-foreground leading-tight">
                      {step.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                      <div className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                        <Sparkles className="size-3" />
                        试试看
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{step.tip}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="mt-auto pt-6 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="gap-1"
                  >
                    <ArrowLeft className="size-3.5" />
                    上一步
                  </Button>
                  <div className="flex-1" />
                  {step.isFinal ? (
                    <Button size="sm" onClick={handleStart} className="gap-1">
                      开始做我的方案
                      <ChevronRight className="size-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleNext} className="gap-1">
                      下一步
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {DEMO_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === currentStep
                      ? 'w-6 bg-background'
                      : i < currentStep
                      ? 'w-1.5 bg-background/60'
                      : 'w-1.5 bg-background/30',
                  )}
                  aria-label={`跳转到第 ${i + 1} 步`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Local cn helper to avoid import issues
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
