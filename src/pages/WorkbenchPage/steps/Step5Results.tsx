import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, FileDown, FileSpreadsheet, BarChart3, CheckCircle2, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlan } from '@/context/PlanContext';
import ReportPdf from '@/components/ReportPdf';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/format';
import { MONTHS } from '@/data/mockPlanData';

export default function Step5Results() {
  const navigate = useNavigate();
  const { currentPlanData, computeMetrics, updatePlanData } = usePlan();

  const metrics = computeMetrics(currentPlanData, currentPlanData?.sandbox);
  const positions = currentPlanData?.positions || [];
  const departments = [...new Set(positions.map((p) => p.department))];

  const handleExportPdf = () => {
    if (!currentPlanData) return;
    toast.info('正在生成 PDF 报告，请稍候…');
    setTimeout(() => {
      window.print();
      toast.success('PDF 报告已生成，请在打印对话框中选择保存');
    }, 100);
  };

  const handleExportData = () => {
    if (!currentPlanData) return;

    const headers = ['部门', '岗位名称', '职级', '当前在职人数', ...MONTHS.map((m) => `${m}编制`), '月固定工资', '浮动工资比例', '雇主社保公积金', '福利费用', '专项费用'];
    const rows = positions.map((p) => [
      p.department, p.name, p.level, p.currentHeadcount,
      ...p.monthlyHeadcount,
      p.monthlyFixedSalary, p.variableRatio, p.socialInsurance, p.welfare, p.specialCost,
    ].join(','));

    const summaryLines = [
      '',
      '方案汇总',
      `编制总数,${metrics.totalHeadcount}`,
      `成本预算（年度）,${metrics.totalCost}`,
      `人力成本率,${metrics.costRatio.toFixed(2)}%`,
      `人均产值,${metrics.perCapitaOutput.toFixed(2)}`,
      `涉及部门,${departments.length}`,
      `岗位数量,${positions.length}`,
    ];

    const csvContent = [headers.join(','), ...rows, ...summaryLines].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `人力规划数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('数据文件已导出');
  };

  const handleGoToReports = () => {
    updatePlanData((d) => ({ ...d, currentStep: 4 }));
    navigate('/reports');
  };

  // Department breakdown
  const deptBreakdown = departments.map((dept) => {
    const deptPositions = positions.filter((p) => p.department === dept);
    const headcount = deptPositions.reduce((s, p) => s + p.monthlyHeadcount[11], 0);
    return { dept, headcount, positionCount: deptPositions.length };
  }).sort((a, b) => b.headcount - a.headcount);

  const maxHc = Math.max(...deptBreakdown.map((d) => d.headcount));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <CheckCircle2 className="size-4" />
            方案已生成
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">人力规划结果汇总</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            以下是基于你设定的目标与参数测算出的完整方案，可前往报表中心查看详细图表分析
          </p>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground mb-1.5">编制总数</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {formatNumber(metrics.totalHeadcount)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  较当前 +{formatNumber(metrics.totalHeadcount - positions.reduce((s, p) => s + p.currentHeadcount, 0))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground mb-1.5">成本预算（年度）</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  ¥{formatCurrency(metrics.totalCost)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  月均 ¥{formatCurrency(metrics.totalCost / 12)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground mb-1.5">人力成本率</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {formatPercent(metrics.costRatio, 2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  占营收比例
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="h-full border-primary/30 bg-primary/[0.02]">
              <CardContent className="p-5">
                <div className="text-xs text-primary/70 mb-1.5 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  人均产值
                </div>
                <div className="text-2xl font-bold text-primary tabular-nums">
                  ¥{formatCurrency(metrics.perCapitaOutput)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  年度人均
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Two column: Dept distribution + Efficiency check */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">编制分布</CardTitle>
            <CardDescription className="text-xs">按部门编制人数分布</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deptBreakdown.map((d, i) => (
              <div key={d.dept}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{d.dept}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {d.headcount} 人 · {d.positionCount} 岗
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{
                      width: `${(d.headcount / maxHc) * 100}%`,
                      transitionDelay: `${i * 0.05}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">人效校验</CardTitle>
            <CardDescription className="text-xs">关键指标健康度检查</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">编制增长在合理范围</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  净增 {formatNumber(metrics.totalHeadcount - positions.reduce((s, p) => s + p.currentHeadcount, 0))} 人，
                  增幅 {formatPercent(
                    ((metrics.totalHeadcount - positions.reduce((s, p) => s + p.currentHeadcount, 0))
                      / positions.reduce((s, p) => s + p.currentHeadcount, 0)) * 100,
                    1,
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">人力成本率健康</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  当前 {formatPercent(metrics.costRatio, 1)}，处于行业合理区间（20%-40%）
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <FileText className="size-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">人效持续提升</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  人均产值 ¥{formatCurrency(metrics.perCapitaOutput)}，
                  沙盘人效提升变量 {formatPercent(currentPlanData?.sandbox.efficiencyGain || 0, 0)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Badge variant="outline" className="shrink-0">提示</Badge>
              <div className="text-xs text-muted-foreground">
                前往报表中心查看完整图表分析与明细数据，支持交互式下钻。
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6"
      >
        <Button size="lg" onClick={handleGoToReports} className="h-11 px-6 gap-2">
          <BarChart3 className="size-4" />
          查看完整报告
          <ArrowRight className="size-4" />
        </Button>
        <Button size="lg" onClick={handleExportPdf} className="h-11 px-6 gap-2">
          <FileDown className="size-4" />
          导出 PDF 报告
        </Button>
        <Button size="lg" variant="outline" onClick={handleExportData} className="h-11 px-6 gap-2">
          <FileSpreadsheet className="size-4" />
          导出数据（财务对账用）
        </Button>
      </motion.div>

      {/* PDF 打印专用容器 */}
      <div className="hidden print:block">
        {currentPlanData && (
          <ReportPdf
            planName="人力规划方案"
            year={new Date().getFullYear()}
            scenarioName="当前方案"
            generatedAt={new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            metrics={metrics}
            positions={positions}
            costParams={currentPlanData.costParams}
          />
        )}
      </div>
    </div>
  );
}
