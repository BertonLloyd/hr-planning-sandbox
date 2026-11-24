import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Info, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { usePlan } from '@/context/PlanContext';
import { formatNumber } from '@/lib/format';
import { MONTHS, CALC_METHODS } from '@/data/mockPlanData';
import { cn } from '@/lib/utils';

export default function Step2Headcount() {
  const { currentPlanData, updatePositions, computeMetrics } = usePlan();
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['技术部', '销售部']));
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const positions = currentPlanData?.positions || [];
  const metrics = computeMetrics(currentPlanData, null);
  const redLine = currentPlanData?.headcountParams.redLine || 120;
  const isOverRedLine = metrics.totalHeadcount > redLine;
  const diffPercent = ((metrics.totalHeadcount - redLine) / redLine) * 100;

  // Group by department
  const deptGroups = useMemo(() => {
    const groups: Record<string, typeof positions> = {};
    for (const p of positions) {
      if (!groups[p.department]) groups[p.department] = [];
      groups[p.department].push(p);
    }
    return groups;
  }, [positions]);

  const departments = Object.keys(deptGroups);

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const handleHeadcountChange = (posId: string, monthIndex: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    updatePositions((prev) =>
      prev.map((p) => {
        if (p.id !== posId) return p;
        const newMonthly = [...p.monthlyHeadcount];
        newMonthly[monthIndex] = num;
        // Propagate changes to later months for consistency
        for (let m = monthIndex + 1; m < 12; m++) {
          if (newMonthly[m] < newMonthly[m - 1]) {
            newMonthly[m] = newMonthly[m - 1];
          }
        }
        return { ...p, monthlyHeadcount: newMonthly };
      }),
    );
  };

  const handleCalcMethodChange = (posId: string, method: string) => {
    updatePositions((prev) =>
      prev.map((p) => {
        if (p.id !== posId) return p;
        // Recalculate based on method
        let newMonthly = [...p.monthlyHeadcount];
        const base = p.currentHeadcount;

        if (method === 'revenue') {
          // 按人均产值倒推: gradual increase based on revenue target
          const targetHc = Math.round(base * 1.5);
          const arrival = p.expectedArrivalMonth - 1;
          newMonthly = new Array(12).fill(base).map((v, i) => {
            if (i < arrival) return v;
            const progress = (i - arrival + 1) / (12 - arrival);
            return Math.round(base + (targetHc - base) * progress);
          });
        } else if (method === 'ratio') {
          // 按配比: moderate growth
          const targetHc = Math.round(base * 1.3);
          newMonthly = new Array(12).fill(base).map((v, i) =>
            Math.round(base + (targetHc - base) * (i / 11)),
          );
        } else if (method === 'span') {
          // 按管理幅度: minimal growth for managers
          const targetHc = base + 1;
          newMonthly = new Array(12).fill(base).map((v, i) =>
            i >= 5 ? targetHc : v,
          );
        }

        return { ...p, monthlyHeadcount: newMonthly, calcMethod: method };
      }),
    );
    toast.success('已按新方法重算');
  };

  // Compute department totals
  const getDeptTotals = (dept: string) => {
    const deptPositions = deptGroups[dept] || [];
    const monthly = new Array(12).fill(0);
    for (const p of deptPositions) {
      for (let m = 0; m < 12; m++) {
        monthly[m] += p.monthlyHeadcount[m];
      }
    }
    const total = monthly[11];
    return { monthly, total };
  };

  // Grand totals by month
  const grandMonthly = useMemo(() => {
    const totals = new Array(12).fill(0);
    for (const p of positions) {
      for (let m = 0; m < 12; m++) {
        totals[m] += p.monthlyHeadcount[m];
      }
    }
    return totals;
  }, [positions]);

  const filteredDepts = selectedDept === 'all' ? departments : [selectedDept];
  const displayPositions = selectedDept === 'all' ? positions : positions.filter((p) => p.department === selectedDept);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_280px] gap-6">
      {/* Left: Department Tree */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">部门结构</CardTitle>
            <CardDescription className="text-xs">展开查看岗位明细</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <button
              onClick={() => setSelectedDept('all')}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                selectedDept === 'all' ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50 text-foreground',
              )}
            >
              全部部门
              <span className="float-right text-xs text-muted-foreground">{positions.length} 岗位</span>
            </button>
            <div className="mt-1 space-y-0.5">
              {departments.map((dept) => {
                const isExpanded = expandedDepts.has(dept);
                const isSelected = selectedDept === dept;
                const totals = getDeptTotals(dept);
                return (
                  <div key={dept}>
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleDept(dept)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => setSelectedDept(dept)}
                        className={cn(
                          'flex-1 text-left px-2 py-1.5 rounded-md text-sm transition-colors min-w-0',
                          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent/50 text-foreground',
                        )}
                      >
                        <span className="truncate block">{dept}</span>
                      </button>
                      <span className="text-xs text-muted-foreground pr-2 tabular-nums shrink-0">
                        {totals.total}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="pl-6 space-y-0.5">
                        {deptGroups[dept].map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-accent/30"
                          >
                            <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                              {p.monthlyHeadcount[11]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Center: Headcount Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="xl:col-span-1"
      >
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">按月编制表</CardTitle>
                <CardDescription className="text-xs">
                  {selectedDept === 'all' ? '全部部门' : selectedDept} · 共 {displayPositions.length} 个岗位
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                合计 {formatNumber(metrics.totalHeadcount)} 人
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap sticky left-0 bg-muted/30 z-10 min-w-[160px] border-r border-border/30">
                      <div className="flex items-center gap-1">
                        岗位名称
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3 text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>岗位名称，左侧首列冻结</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap min-w-[80px]">
                      <div className="flex items-center gap-1">
                        职级
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3 text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>岗位职级序列</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center gap-1">
                        测算方法
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3 text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>点击切换编制测算方法</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                    {MONTHS.map((m, i) => (
                      <th
                        key={i}
                        className="text-right font-medium text-muted-foreground px-3 py-2 whitespace-nowrap min-w-[60px]"
                      >
                        <div className="flex items-center justify-end gap-1">
                          {m}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-3 text-muted-foreground shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>{m}月末编制人数</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </th>
                    ))}
                    <th className="text-right font-medium text-foreground px-3 py-2 whitespace-nowrap sticky right-0 bg-muted/30 z-10 min-w-[80px] border-l border-border/30">
                      <div className="flex items-center justify-end gap-1">
                        合计
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3 text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>12 月末编制人数，右侧列冻结</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayPositions.map((p) => (
                    <tr key={p.id} className="border-t border-border/50 hover:bg-accent/20">
                      <td className="px-3 py-2 sticky left-0 bg-card z-10 border-r border-border/30">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.department}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.level}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={p.calcMethod || 'revenue'}
                          onValueChange={(val) => handleCalcMethodChange(p.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CALC_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value} className="text-xs">
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {p.monthlyHeadcount.map((hc, mi) => {
                        const isEditable = mi >= p.expectedArrivalMonth - 1;
                        return (
                          <td key={mi} className="px-3 py-1.5 text-right">
                            <input
                              type="text"
                              value={hc}
                              onChange={(e) => handleHeadcountChange(p.id, mi, e.target.value)}
                              className={cn(
                                'w-12 text-right tabular-nums rounded px-1 py-0.5 text-sm border',
                                isEditable
                                  ? 'bg-background border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                                  : 'bg-muted/30 border-transparent text-muted-foreground cursor-not-allowed',
                              )}
                              readOnly={!isEditable}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-medium text-foreground sticky right-0 bg-card z-10 border-l border-border/30 tabular-nums">
                        {p.monthlyHeadcount[11]}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-medium">
                    <td className="px-3 py-2 sticky left-0 bg-muted/30 z-10 border-r border-border/30">
                      合计
                    </td>
                    <td className="px-3 py-2" colSpan={2}></td>
                    {grandMonthly.map((v, i) => (
                      <td key={i} className="px-3 py-2 text-right tabular-nums text-foreground">
                        {v}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-primary font-semibold sticky right-0 bg-muted/30 z-10 border-l border-border/30 tabular-nums">
                      {metrics.totalHeadcount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right: Red Line Panel */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              编制红线
            </CardTitle>
            <CardDescription className="text-xs">总量控制与实时对比</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="text-xs text-muted-foreground mb-1">编制总数</div>
              <div className={cn(
                'text-3xl font-bold tabular-nums',
                isOverRedLine ? 'text-destructive' : 'text-foreground',
              )}>
                {formatNumber(metrics.totalHeadcount)}
                <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">红线值</div>
              <div className="text-lg font-semibold tabular-nums text-foreground">
                {formatNumber(redLine)}
                <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">差异</span>
                <span className={cn(
                  'font-medium tabular-nums',
                  isOverRedLine ? 'text-destructive' : 'text-primary',
                )}>
                  {diffPercent > 0 ? '+' : ''}{formatNumber(diffPercent, 1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    isOverRedLine ? 'bg-destructive' : 'bg-primary',
                  )}
                  style={{ width: `${Math.min((metrics.totalHeadcount / redLine) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>红线 {redLine}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">当前在职</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(positions.reduce((s, p) => s + p.currentHeadcount, 0))} 人
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">净增编制</span>
                <span className="font-medium tabular-nums text-primary">
                  +{formatNumber(metrics.totalHeadcount - positions.reduce((s, p) => s + p.currentHeadcount, 0))} 人
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">涉及部门</span>
                <span className="font-medium">{departments.length} 个</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
