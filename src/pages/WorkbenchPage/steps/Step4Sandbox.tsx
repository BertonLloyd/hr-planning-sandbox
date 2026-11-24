import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Minus, Save, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePlan } from '@/context/PlanContext';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { IScenario } from '@/data/mockPlanData';

export default function Step4Sandbox() {
  const { currentPlanData, updateSandbox, baselineSandbox, sandboxDraft, resetSandboxToBaseline, scenarios, saveScenario, computeMetrics } = usePlan();
  const [activeScenario, setActiveScenario] = useState<string>('neutral');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');

  // 每次进入沙盘步骤，强制用最新保存的基线值重置草稿
  // 确保第一步修改营收保存后，进入沙盘立即显示新值
  useEffect(() => {
    if (baselineSandbox) {
      resetSandboxToBaseline();
      // 同步把 activeScenario 重置为 neutral
      setActiveScenario('neutral');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 活动沙盘值：草稿值优先（用户拖动中的），其次基线值
  const sandbox = sandboxDraft || baselineSandbox || {
    revenueTarget: 120000000,
    efficiencyGain: 0,
    salaryAdjustment: 5,
    ratio: 1.0,
  };

  const currentMetrics = computeMetrics(currentPlanData, sandbox);

  // Base metrics (neutral / baseline)
  const baseScenario = scenarios.find((s) => s.type === 'neutral');
  const baseMetrics = useMemo(() => {
    if (!baseScenario || !currentPlanData) return currentMetrics;
    return computeMetrics(currentPlanData, baseScenario.variables);
  }, [baseScenario, currentPlanData, computeMetrics, currentMetrics]);

  const handleSliderChange = (key: keyof typeof sandbox, value: number) => {
    updateSandbox({ [key]: value });
  };

  const handleInputChange = (key: keyof typeof sandbox, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateSandbox({ [key]: num });
  };

  const handleApplyScenario = (scenario: IScenario) => {
    setActiveScenario(scenario.id);
    updateSandbox(scenario.variables);
  };

  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) {
      toast.error('请输入情景名称');
      return;
    }
    const newScenario: IScenario = {
      id: `scenario-custom-${Date.now()}`,
      name: newScenarioName.trim(),
      type: 'custom',
      variables: { ...sandbox },
    };
    saveScenario(newScenario);
    setNewScenarioName('');
    setSaveDialogOpen(false);
    setActiveScenario(newScenario.id);
    toast.success(`已保存情景「${newScenario.name}」`);
  };

  // Comparison metrics for all scenarios
  const scenarioMetrics = useMemo(() => {
    if (!currentPlanData) return [];
    return scenarios.map((s) => ({
      ...s,
      metrics: computeMetrics(currentPlanData, s.variables),
    }));
  }, [scenarios, currentPlanData, computeMetrics]);

  const MetricDelta = ({ value, base, format, type }: { value: number; base: number; format: (n: number) => string; type: 'lowerBetter' | 'higherBetter' }) => {
    const diff = value - base;
    const pct = base > 0 ? (diff / base) * 100 : 0;
    const isBetter = type === 'higherBetter' ? diff > 0 : diff < 0;
    const isSame = Math.abs(diff) < 0.01;

    return (
      <span className={cn(
        'text-xs font-medium flex items-center gap-0.5',
        isSame ? 'text-muted-foreground' : isBetter ? 'text-primary' : 'text-destructive',
      )}>
        {isSame ? (
          <Minus className="size-3" />
        ) : diff > 0 ? (
          <TrendingUp className="size-3" />
        ) : (
          <TrendingDown className="size-3" />
        )}
        {diff > 0 ? '+' : ''}{format(pct)}
      </span>
    );
  };

  const sliderConfigs = [
    {
      key: 'revenueTarget' as const,
      label: '营收目标',
      min: 50000000,
      max: 200000000,
      step: 5000000,
      unit: '元',
      display: (v: number) => formatCurrency(v),
    },
    {
      key: 'efficiencyGain' as const,
      label: '人效提升',
      min: 0,
      max: 30,
      step: 1,
      unit: '%',
      display: (v: number) => `${v}%`,
    },
    {
      key: 'salaryAdjustment' as const,
      label: '调薪幅度',
      min: 0,
      max: 15,
      step: 0.5,
      unit: '%',
      display: (v: number) => `${v}%`,
    },
    {
      key: 'ratio' as const,
      label: '配比系数',
      min: 0.7,
      max: 1.3,
      step: 0.05,
      unit: 'x',
      display: (v: number) => `${v.toFixed(2)}x`,
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
      {/* Left: Sliders + Scenarios */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Variable sliders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-primary" />
                  沙盘变量
                </CardTitle>
                <CardDescription className="text-xs">调整变量，右侧指标实时变化</CardDescription>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetSandboxToBaseline}>
                  <RotateCcw className="size-3.5" />
                  恢复为方案值
                </Button>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Save className="size-3.5" />
                      另存为新情景
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>保存为新情景</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="scenario-name" className="text-sm">情景名称</Label>
                    <Input
                      id="scenario-name"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="如：Q3 保守方案"
                      className="mt-1.5"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveScenario}>保存</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sliderConfigs.map((config) => {
              const value = sandbox[config.key];
              const pct = ((value - config.min) / (config.max - config.min)) * 100;
              return (
                <div key={config.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">{config.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={config.key === 'revenueTarget' ? value.toString() : config.display(value)}
                        onChange={(e) => {
                          if (config.key === 'revenueTarget') {
                            handleInputChange(config.key, e.target.value);
                          } else if (config.key === 'ratio') {
                            handleInputChange(config.key, e.target.value.replace('x', ''));
                          } else {
                            handleInputChange(config.key, e.target.value.replace('%', ''));
                          }
                        }}
                        className="w-28 h-7 text-xs text-right tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="relative h-2">
                    <div className="absolute inset-0 bg-muted rounded-full" />
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <input
                      type="range"
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={value}
                      onChange={(e) => handleSliderChange(config.key, parseFloat(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 size-4 bg-primary rounded-full border-2 border-background shadow-sm pointer-events-none transition-all"
                      style={{ left: `calc(${pct}% - 8px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{config.min === 50000000 ? '5000万' : config.key === 'ratio' ? '0.7x' : `${config.min}${config.unit}`}</span>
                    <span>{config.max === 200000000 ? '2亿' : config.key === 'ratio' ? '1.3x' : `${config.max}${config.unit}`}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Scenario comparison */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">情景对比</CardTitle>
            <CardDescription className="text-xs">乐观 / 中性 / 悲观 三种预设情景，可切换查看</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeScenario} onValueChange={(v) => {
              const sc = scenarios.find((s) => s.id === v);
              if (sc) handleApplyScenario(sc);
            }}>
              <TabsList className="grid grid-cols-3 mb-4">
                {scenarios.filter((s) => s.type !== 'custom').map((s) => (
                  <TabsTrigger key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {scenarios.filter((s) => s.type !== 'custom').map((s) => (
                <TabsContent key={s.id} value={s.id}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">营收目标</div>
                      <div className="text-sm font-medium tabular-nums">¥{formatCurrency(s.variables.revenueTarget)}</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">人效提升</div>
                      <div className="text-sm font-medium tabular-nums">{s.variables.efficiencyGain}%</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">调薪幅度</div>
                      <div className="text-sm font-medium tabular-nums">{s.variables.salaryAdjustment}%</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-1">配比系数</div>
                      <div className="text-sm font-medium tabular-nums">{s.variables.ratio.toFixed(2)}x</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => handleApplyScenario(s)}
                  >
                    应用此情景
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            {/* Custom scenarios list */}
            {scenarios.filter((s) => s.type === 'custom').length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">我的情景</div>
                <div className="space-y-2">
                  {scenarios.filter((s) => s.type === 'custom').map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        activeScenario === s.id
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border hover:border-border/80 hover:bg-accent/20',
                      )}
                      onClick={() => handleApplyScenario(s)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.name}</span>
                        <Badge variant="outline" className="text-xs">自定义</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        营收 ¥{formatCurrency(s.variables.revenueTarget)} · 人效 +{s.variables.efficiencyGain}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-scenario comparison table */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground mb-3">三情景指标对比</div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground text-xs py-2 pr-3">指标</th>
                      {scenarioMetrics.filter((s) => s.type !== 'custom').map((s) => (
                        <th
                          key={s.id}
                          className={cn(
                            'text-right font-medium text-xs py-2 px-3',
                            activeScenario === s.id ? 'text-primary' : 'text-muted-foreground',
                          )}
                        >
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs text-foreground">编制总数</td>
                      {scenarioMetrics.filter((s) => s.type !== 'custom').map((s) => (
                        <td key={s.id} className="text-right py-2 px-3 tabular-nums text-sm">
                          {formatNumber(s.metrics.totalHeadcount)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs text-foreground">成本预算</td>
                      {scenarioMetrics.filter((s) => s.type !== 'custom').map((s) => (
                        <td key={s.id} className="text-right py-2 px-3 tabular-nums text-sm">
                          ¥{formatCurrency(s.metrics.totalCost)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs text-foreground">人力成本率</td>
                      {scenarioMetrics.filter((s) => s.type !== 'custom').map((s) => (
                        <td key={s.id} className="text-right py-2 px-3 tabular-nums text-sm">
                          {formatPercent(s.metrics.costRatio, 2)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-xs text-foreground">人均产值</td>
                      {scenarioMetrics.filter((s) => s.type !== 'custom').map((s) => (
                        <td key={s.id} className="text-right py-2 px-3 tabular-nums text-sm">
                          ¥{formatCurrency(s.metrics.perCapitaOutput)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right: Real-time metrics */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="sticky top-36">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">实时指标</CardTitle>
            <CardDescription className="text-xs">基于当前变量的测算结果</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-xs text-muted-foreground mb-1">编制总数</div>
              <div className="text-2xl font-bold text-foreground tabular-nums flex items-baseline gap-2">
                {formatNumber(currentMetrics.totalHeadcount)}
                <span className="text-sm font-normal text-muted-foreground">人</span>
              </div>
              <div className="mt-1.5">
                <MetricDelta
                  value={currentMetrics.totalHeadcount}
                  base={baseMetrics.totalHeadcount}
                  format={(n) => formatPercent(Math.abs(n), 1)}
                  type="lowerBetter"
                />
                <span className="text-xs text-muted-foreground ml-1">较基准</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-border/30 border border-border">
              <div className="text-xs text-muted-foreground mb-1">成本预算（年度）</div>
              <div className="text-2xl font-bold text-foreground tabular-nums flex items-baseline gap-2">
                ¥{formatCurrency(currentMetrics.totalCost)}
              </div>
              <div className="mt-1.5">
                <MetricDelta
                  value={currentMetrics.totalCost}
                  base={baseMetrics.totalCost}
                  format={(n) => formatPercent(Math.abs(n), 1)}
                  type="lowerBetter"
                />
                <span className="text-xs text-muted-foreground ml-1">较基准</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-border/30 border border-border">
              <div className="text-xs text-muted-foreground mb-1">人力成本率</div>
              <div className="text-2xl font-bold text-foreground tabular-nums flex items-baseline gap-2">
                {formatPercent(currentMetrics.costRatio, 2)}
              </div>
              <div className="mt-1.5">
                <MetricDelta
                  value={currentMetrics.costRatio}
                  base={baseMetrics.costRatio}
                  format={(n) => formatPercent(Math.abs(n), 2)}
                  type="lowerBetter"
                />
                <span className="text-xs text-muted-foreground ml-1">较基准</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-accent/40 border border-accent">
              <div className="text-xs text-muted-foreground mb-1">人均产值</div>
              <div className="text-2xl font-bold text-primary tabular-nums flex items-baseline gap-2">
                ¥{formatCurrency(currentMetrics.perCapitaOutput)}
              </div>
              <div className="mt-1.5">
                <MetricDelta
                  value={currentMetrics.perCapitaOutput}
                  base={baseMetrics.perCapitaOutput}
                  format={(n) => formatPercent(Math.abs(n), 1)}
                  type="higherBetter"
                />
                <span className="text-xs text-muted-foreground ml-1">较基准</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
