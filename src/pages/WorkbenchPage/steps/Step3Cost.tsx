import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Settings, Calculator, Edit3, X, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePlan, computeMonthlyCosts } from '@/context/PlanContext';
import { formatNumber, formatCurrency } from '@/lib/format';
import { MONTHS, type IPosition } from '@/data/mockPlanData';
import { cn } from '@/lib/utils';
import { scopedStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';

export default function Step3Cost() {
  const { currentPlanData, updateCostParams, updatePositions } = usePlan();
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [showFirstHint, setShowFirstHint] = useState(false);

  // 首次进入成本步骤提示（一次性，关闭后不再显示）
  useEffect(() => {
    const seen = scopedStorage.getItem('__hp_cost_edit_hint_seen');
    if (!seen) {
      setShowFirstHint(true);
    }
  }, []);

  const dismissHint = () => {
    setShowFirstHint(false);
    scopedStorage.setItem('__hp_cost_edit_hint_seen', '1');
  };

  const positions = currentPlanData?.positions || [];
  const costParams = currentPlanData?.costParams || { arrivalMonth: 3, salaryIncrease: 5, turnoverRate: 15 };

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

  const monthlyCosts = useMemo(() => {
    if (!currentPlanData) return new Array(12).fill(0);
    return computeMonthlyCosts(positions, costParams);
  }, [positions, costParams, currentPlanData]);

  const totalAnnualCost = monthlyCosts.reduce((a, b) => a + b, 0);

  const togglePosition = (id: string) => {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayPositions = selectedDept === 'all' ? positions : positions.filter((p) => p.department === selectedDept);

  // Calculate per-position annual cost
  const getPositionAnnualCost = (pos: typeof positions[0]) => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      const hc = pos.monthlyHeadcount[m];
      const salaryMult = 1 + (costParams.salaryIncrease / 100) * (m / 11);
      const fixed = pos.monthlyFixedSalary * salaryMult;
      const variable = fixed * pos.variableRatio;
      const perPersonCost = fixed + variable + pos.socialInsurance + pos.welfare + pos.specialCost;
      total += perPersonCost * hc;
    }
    const turnoverAdjustment = 1 + (costParams.turnoverRate / 100) * 0.3;
    return total * turnoverAdjustment;
  };

  // Cost breakdown for a position (annual)
  const getPositionCostBreakdown = (pos: typeof positions[0]) => {
    let fixed = 0, variable = 0, social = 0, welfare = 0, special = 0;
    for (let m = 0; m < 12; m++) {
      const hc = pos.monthlyHeadcount[m];
      const salaryMult = 1 + (costParams.salaryIncrease / 100) * (m / 11);
      const f = pos.monthlyFixedSalary * salaryMult;
      const v = f * pos.variableRatio;
      fixed += f * hc;
      variable += v * hc;
      social += pos.socialInsurance * hc;
      welfare += pos.welfare * hc;
      special += pos.specialCost * hc;
    }
    const turnoverMult = 1 + (costParams.turnoverRate / 100) * 0.3;
    const totalHc = pos.monthlyHeadcount[11] || 1;
    const total = (fixed + variable + social + welfare + special) * turnoverMult;
    return {
      fixed: fixed * turnoverMult,
      variable: variable * turnoverMult,
      social: social * turnoverMult,
      welfare: welfare * turnoverMult,
      special: special * turnoverMult,
      perPersonAnnual: total / totalHc,
    };
  };

  const handlePositionCostChange = (posId: string, field: keyof IPosition, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    updatePositions((prev) =>
      prev.map((p) => {
        if (p.id !== posId) return p;
        if (field === 'variableRatio') {
          // 容错：大于 1 的按百分比处理
          let v = num;
          if (v > 1) v = v / 100;
          if (v > 1) v = 1;
          return { ...p, variableRatio: v };
        }
        return { ...p, [field]: num };
      }),
    );
  };

  const handleParamChange = (key: keyof typeof costParams, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateCostParams({ [key]: num });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Cost breakdown by position */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">岗位成本构成</CardTitle>
                <CardDescription className="text-xs">点击岗位行或「编辑」按钮调整每个岗位的成本项</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="all">全部部门</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <Badge variant="outline" className="text-xs">
                  {displayPositions.length} 个岗位
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {/* 首次进入提示条 */}
              <AnimatePresence>
                {showFirstHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-primary/5 border-b border-primary/20"
                  >
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Lightbulb className="size-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs text-foreground/80">
                        <span className="font-medium text-foreground">小提示：</span>
                        每个岗位右侧都有「编辑」按钮，点开后可以调整月固定工资、浮动比例、社保公积金等 5 项成本构成，修改后下方月度成本与右侧合计会实时联动。
                      </div>
                      <button
                        onClick={dismissHint}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="关闭提示"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {displayPositions.map((p) => {
                const isExpanded = expandedPositions.has(p.id);
                const annualCost = getPositionAnnualCost(p);
                const breakdown = getPositionCostBreakdown(p);
                const totalHc = p.monthlyHeadcount[11];
                return (
                  <div key={p.id}>
                    <button
                      onClick={() => togglePosition(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors text-left"
                    >
                      <ChevronDown
                        className={cn(
                          'size-4 text-muted-foreground shrink-0 transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.department}</span>
                          <Badge variant="outline" className="text-xs font-normal">{p.level}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          编制 {totalHc} 人 · 月固薪 ¥{formatNumber(p.monthlyFixedSalary)} · 浮动 {(p.variableRatio * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div className="hidden sm:block text-right mr-1">
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            ¥{formatCurrency(annualCost)}
                          </div>
                          <div className="text-xs text-muted-foreground">年度成本</div>
                        </div>
                        <Button
                          size="sm"
                          variant={isExpanded ? 'default' : 'secondary'}
                          className="h-7 gap-1 text-xs shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePosition(p.id);
                          }}
                        >
                          <Edit3 className="size-3.5" />
                          {isExpanded ? '收起' : '编辑'}
                        </Button>
                        <ChevronDown
                          className={cn(
                            'size-4 text-muted-foreground shrink-0 transition-transform sm:hidden',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-muted/20 px-4 pb-4"
                      >
                        <div className="pt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">月固定工资</Label>
                            <Input
                              type="number"
                              min={0}
                              value={p.monthlyFixedSalary}
                              onChange={(e) => handlePositionCostChange(p.id, 'monthlyFixedSalary', e.target.value)}
                              className="h-8 text-sm tabular-nums text-right"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">浮动比例 (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={(p.variableRatio * 100).toFixed(0)}
                              onChange={(e) => handlePositionCostChange(p.id, 'variableRatio', e.target.value)}
                              className="h-8 text-sm tabular-nums text-right"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">社保公积金</Label>
                            <Input
                              type="number"
                              min={0}
                              value={p.socialInsurance}
                              onChange={(e) => handlePositionCostChange(p.id, 'socialInsurance', e.target.value)}
                              className="h-8 text-sm tabular-nums text-right"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">福利费用</Label>
                            <Input
                              type="number"
                              min={0}
                              value={p.welfare}
                              onChange={(e) => handlePositionCostChange(p.id, 'welfare', e.target.value)}
                              className="h-8 text-sm tabular-nums text-right"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">专项费用</Label>
                            <Input
                              type="number"
                              min={0}
                              value={p.specialCost}
                              onChange={(e) => handlePositionCostChange(p.id, 'specialCost', e.target.value)}
                              className="h-8 text-sm tabular-nums text-right"
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          年人均成本：<span className="text-foreground font-medium tabular-nums">¥{formatCurrency(breakdown.perPersonAnnual)}</span>
                          {' · '}年度合计：<span className="text-foreground font-medium tabular-nums">¥{formatCurrency(annualCost)}</span>
                        </div>

                        {/* Monthly cost bar for this position */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="text-xs text-muted-foreground mb-2">月度成本趋势</div>
                          <div className="flex items-end gap-1 h-16">
                            {p.monthlyHeadcount.map((hc, mi) => {
                              const salaryMult = 1 + (costParams.salaryIncrease / 100) * (mi / 11);
                              const perPerson = p.monthlyFixedSalary * salaryMult * (1 + p.variableRatio)
                                + p.socialInsurance + p.welfare + p.specialCost;
                              const cost = perPerson * hc;
                              const maxCost = Math.max(
                                ...p.monthlyHeadcount.map((h, i) => {
                                  const sm = 1 + (costParams.salaryIncrease / 100) * (i / 11);
                                  const pp = p.monthlyFixedSalary * sm * (1 + p.variableRatio)
                                    + p.socialInsurance + p.welfare + p.specialCost;
                                  return pp * h;
                                }),
                              );
                              const heightPercent = maxCost > 0 ? (cost / maxCost) * 100 : 0;
                              return (
                                <div
                                  key={mi}
                                  className="flex-1 bg-primary/20 rounded-t relative group cursor-help"
                                  style={{ height: `${heightPercent}%` }}
                                >
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {MONTHS[mi]}: ¥{formatCurrency(cost)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>1月</span>
                            <span>12月</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly cash flow table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">按月成本现金流</CardTitle>
            <CardDescription className="text-xs">全年 12 个月人力成本支出明细</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    {MONTHS.map((m, i) => (
                      <th
                        key={i}
                        className="text-right font-medium text-muted-foreground px-4 py-2 whitespace-nowrap min-w-[100px]"
                      >
                        {m}
                      </th>
                    ))}
                    <th className="text-right font-medium text-foreground px-4 py-2 whitespace-nowrap min-w-[120px] bg-muted/30 sticky right-0">
                      年度合计
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/50">
                    {monthlyCosts.map((v, i) => (
                      <td key={i} className="px-4 py-2.5 text-right tabular-nums font-medium">
                        ¥{formatCurrency(v)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary bg-muted/20 sticky right-0">
                      ¥{formatCurrency(totalAnnualCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cost bar visualization */}
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-end gap-1 h-20">
                {monthlyCosts.map((v, i) => {
                  const maxV = Math.max(...monthlyCosts);
                  const pct = maxV > 0 ? (v / maxV) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/30 hover:bg-primary/50 rounded-t transition-colors relative group cursor-help"
                      style={{ height: `${pct}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {MONTHS[i]}：¥{formatCurrency(v)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right: Parameter panel */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="sticky top-36">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              参数设置
            </CardTitle>
            <CardDescription className="text-xs">调整参数后成本实时重算</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="arrival-month" className="text-xs text-muted-foreground">
                平均到岗时间（月份）
              </Label>
              <Input
                id="arrival-month"
                type="number"
                min={1}
                max={12}
                value={costParams.arrivalMonth}
                onChange={(e) => handleParamChange('arrivalMonth', e.target.value)}
                className="tabular-nums"
              />
              <div className="text-xs text-muted-foreground">新增人员平均到岗月份</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary-increase" className="text-xs text-muted-foreground">
                调薪幅度（%）
              </Label>
              <Input
                id="salary-increase"
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={costParams.salaryIncrease}
                onChange={(e) => handleParamChange('salaryIncrease', e.target.value)}
                className="tabular-nums"
              />
              <div className="text-xs text-muted-foreground">年度薪资调整增幅，按月递增</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="turnover-rate" className="text-xs text-muted-foreground">
                人员流动率（%）
              </Label>
              <Input
                id="turnover-rate"
                type="number"
                min={0}
                max={50}
                step={1}
                value={costParams.turnoverRate}
                onChange={(e) => handleParamChange('turnoverRate', e.target.value)}
                className="tabular-nums"
              />
              <div className="text-xs text-muted-foreground">年度人员流动率，影响招聘与培训成本</div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">年度总成本</span>
                <span className="text-lg font-bold text-primary tabular-nums">
                  ¥{formatCurrency(totalAnnualCost)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">月均成本</span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  ¥{formatCurrency(totalAnnualCost / 12)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">人均年成本</span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  ¥{formatCurrency(
                    totalAnnualCost / (positions.reduce((s, p) => s + p.monthlyHeadcount.reduce((a, b) => a + b, 0) / 12, 0) || 1),
                  )}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Calculator className="size-3" />
                成本构成
              </div>
              <div className="space-y-1.5">
                {[
                  { label: '固定工资', value: positions.reduce((s, p) => s + getPositionCostBreakdown(p).fixed, 0), color: 'bg-primary' },
                  { label: '浮动工资', value: positions.reduce((s, p) => s + getPositionCostBreakdown(p).variable, 0), color: 'bg-primary/60' },
                  { label: '社保公积金', value: positions.reduce((s, p) => s + getPositionCostBreakdown(p).social, 0), color: 'bg-primary/40' },
                  { label: '福利与专项', value: positions.reduce((s, p) => s + getPositionCostBreakdown(p).welfare + getPositionCostBreakdown(p).special, 0), color: 'bg-primary/20' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-foreground">{item.label}</span>
                      <span className="tabular-nums text-muted-foreground">¥{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full`}
                        style={{ width: `${(item.value / totalAnnualCost) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
