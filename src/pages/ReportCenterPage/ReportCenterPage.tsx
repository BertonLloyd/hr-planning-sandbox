import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Info, TrendingUp, Users, DollarSign, PieChart, BarChart3, FileDown, FileSpreadsheet,
} from 'lucide-react';
import ReportPdf from '@/components/ReportPdf';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { usePlan, computeMonthlyCosts } from '@/context/PlanContext';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/format';
import { CHART_PALETTE, CHART_COLORS } from '@/lib/chart-colors';
import { MONTHS } from '@/data/mockPlanData';
import { cn } from '@/lib/utils';

export default function ReportCenterPage() {
  const { currentPlanData, computeMetrics, currentPlanId, planList, setCurrentPlan, loadDemoData } = usePlan();

  // Auto-load first plan or demo data if no current plan selected
  useEffect(() => {
    if (currentPlanId) return;
    if (planList.length > 0) {
      setCurrentPlan(planList[0].id);
    } else {
      loadDemoData();
    }
  }, [currentPlanId, planList, setCurrentPlan, loadDemoData]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCostCategory, setSelectedCostCategory] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('headcount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const metrics = computeMetrics(currentPlanData, null);
  const positions = currentPlanData?.positions || [];
  const costParams = currentPlanData?.costParams || { arrivalMonth: 3, salaryIncrease: 5, turnoverRate: 15 };
  const departments = [...new Set(positions.map((p) => p.department))];

  // Monthly per-capita output (trend line)
  const monthlyOutputData = useMemo(() => {
    const revenue = currentPlanData?.sandbox.revenueTarget || currentPlanData?.target.annualRevenue || 120000000;
    const monthlyRevenue = revenue / 12;
    const data = MONTHS.map((_, i) => {
      const hc = positions.reduce((s, p) => s + p.monthlyHeadcount[i], 0);
      return hc > 0 ? monthlyRevenue / hc * 12 : 0; // annualized per-capita
    });
    return data;
  }, [positions, currentPlanData]);

  // Cost structure (pie chart data)
  const costStructure = useMemo(() => {
    let fixed = 0, variable = 0, social = 0, welfare = 0, special = 0;
    for (const p of positions) {
      for (let m = 0; m < 12; m++) {
        const hc = p.monthlyHeadcount[m];
        const salaryMult = 1 + (costParams.salaryIncrease / 100) * (m / 11);
        const f = p.monthlyFixedSalary * salaryMult;
        const v = f * p.variableRatio;
        fixed += f * hc;
        variable += v * hc;
        social += p.socialInsurance * hc;
        welfare += p.welfare * hc;
        special += p.specialCost * hc;
      }
    }
    const turnoverMult = 1 + (costParams.turnoverRate / 100) * 0.3;
    return [
      { name: '固定工资', value: fixed * turnoverMult },
      { name: '浮动工资', value: variable * turnoverMult },
      { name: '社保公积金', value: social * turnoverMult },
      { name: '福利费用', value: welfare * turnoverMult },
      { name: '专项费用', value: special * turnoverMult },
    ];
  }, [positions, costParams]);

  // Department headcount distribution (bar chart)
  const deptDistribution = useMemo(() => {
    return departments
      .map((dept) => ({
        name: dept,
        value: positions.filter((p) => p.department === dept).reduce((s, p) => s + p.monthlyHeadcount[11], 0),
      }))
      .sort((a, b) => b.value - a.value);
  }, [departments, positions]);

  // Line chart option
  const lineOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: MONTHS,
      boundaryGap: false,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
          return value.toString();
        },
      },
    },
    series: [
      {
        name: '人均产值',
        type: 'line',
        data: monthlyOutputData,
        smooth: true,
        lineStyle: { width: 2, color: CHART_COLORS.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(15, 111, 220, 0.2)' },
              { offset: 1, color: 'rgba(15, 111, 220, 0.02)' },
            ],
          },
        },
        itemStyle: { color: CHART_COLORS.primary },
      },
    ],
  };

  // Pie chart option
  const pieOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 12 } },
    color: CHART_PALETTE,
    series: [
      {
        name: '成本结构',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: false },
        },
        data: costStructure.map((item) => ({
          ...item,
          itemStyle: selectedCostCategory === item.name
            ? { opacity: 1 }
            : { opacity: selectedCostCategory ? 0.5 : 1 },
        })),
      },
    ],
  };

  // Bar chart option
  const barOption: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: deptDistribution.map((d) => d.name),
      axisLabel: { fontSize: 11, interval: 0, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        name: '编制人数',
        type: 'bar',
        data: deptDistribution.map((d) => ({
          value: d.value,
          itemStyle: {
            color: selectedDept === d.name ? CHART_COLORS.primary : CHART_COLORS.primary + '60',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: '50%',
      },
    ],
  };

  // Handle chart click for drill-down
  const handleLineChartClick = (params: any) => {
    if (params.componentType === 'series') {
      setSelectedMonth(params.dataIndex);
    }
  };

  const handlePieChartClick = (params: any) => {
    if (params.name) {
      setSelectedCostCategory(selectedCostCategory === params.name ? null : params.name);
      setSelectedDept(null);
    }
  };

  const handleBarChartClick = (params: any) => {
    if (params.name) {
      setSelectedDept(selectedDept === params.name ? null : params.name);
      setSelectedCostCategory(null);
    }
  };

  // Detail table data
  const detailData = useMemo(() => {
    let data = positions.map((p) => {
      let cost = 0;
      for (let m = 0; m < 12; m++) {
        const hc = p.monthlyHeadcount[m];
        const salaryMult = 1 + (costParams.salaryIncrease / 100) * (m / 11);
        const perPerson = p.monthlyFixedSalary * salaryMult * (1 + p.variableRatio)
          + p.socialInsurance + p.welfare + p.specialCost;
        cost += perPerson * hc;
      }
      const turnoverMult = 1 + (costParams.turnoverRate / 100) * 0.3;
      return {
        ...p,
        totalCost: cost * turnoverMult,
        endHeadcount: p.monthlyHeadcount[11],
      };
    });

    if (selectedDept) {
      data = data.filter((d) => d.department === selectedDept);
    }

    data.sort((a, b) => {
      let av: number, bv: number;
      switch (sortField) {
        case 'cost':
          av = a.totalCost; bv = b.totalCost;
          break;
        case 'dept':
          return sortOrder === 'asc' ? a.department.localeCompare(b.department) : b.department.localeCompare(a.department);
        case 'headcount':
        default:
          av = a.endHeadcount; bv = b.endHeadcount;
      }
      return sortOrder === 'asc' ? av - bv : bv - av;
    });

    return data;
  }, [positions, costParams, selectedDept, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportPdf = () => {
    if (!currentPlanData) return;
    toast.info('正在生成 PDF 报告，请稍候…');
    // 等待 echarts 图表渲染完成后再打印
    setTimeout(() => {
      window.print();
      toast.success('PDF 报告已生成，请在打印对话框中选择保存');
    }, 1000);
  };

  const handleExportData = () => {
    if (!currentPlanData) return;

    const headers = ['部门', '岗位名称', '职级', '年末编制', '年度成本', '月固定工资', '浮动比例', '社保公积金', '福利费用', '专项费用'];
    const rows = detailData.map((p) => [
      p.department, p.name, p.level, p.endHeadcount, p.totalCost.toFixed(0),
      p.monthlyFixedSalary, p.variableRatio, p.socialInsurance, p.welfare, p.specialCost,
    ].join(','));

    const monthlyCosts = computeMonthlyCosts(positions, costParams);
    const costSection = [
      '',
      '月度成本现金流',
      [...MONTHS, '年度合计'].join(','),
      [...monthlyCosts, monthlyCosts.reduce((a, b) => a + b, 0).toFixed(0)].join(','),
    ];

    const csvContent = [headers.join(','), ...rows, ...costSection].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentPlanData.target.annualRevenue ? '' : ''}人力规划数据_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('数据文件已导出');
  };

  const kpiCards = [
    {
      title: '编制总数',
      value: formatNumber(metrics.totalHeadcount),
      unit: '人',
      icon: Users,
      description: '年末规划编制总人数',
      formula: '各岗位 12 月末编制人数之和',
      source: '编制测算表',
    },
    {
      title: '成本预算',
      value: `¥${formatCurrency(metrics.totalCost)}`,
      unit: '',
      icon: DollarSign,
      description: '年度人力成本总额',
      formula: '12 个月各岗位成本累加，含固定工资、浮动工资、社保公积金、福利、专项费用及流动率调整',
      source: '成本测算表',
    },
    {
      title: '人力成本率',
      value: formatPercent(metrics.costRatio, 2),
      unit: '',
      icon: PieChart,
      description: '人力成本占营收比例',
      formula: '年度人力成本总额 ÷ 年度营收目标 × 100%',
      source: '成本测算 + 目标设定',
    },
    {
      title: '人均产值',
      value: `¥${formatCurrency(metrics.perCapitaOutput)}`,
      unit: '',
      icon: TrendingUp,
      description: '年度人均创造营收',
      formula: '年度营收目标 ÷ 年末编制总数',
      source: '目标设定 + 编制测算',
    },
  ];

  if (!currentPlanData) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold text-foreground">报表中心</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              完整数据看板与明细分析
              {(selectedDept || selectedCostCategory || selectedMonth !== null) && (
                <Badge variant="outline" className="ml-2 text-xs">已筛选</Badge>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(selectedDept || selectedCostCategory || selectedMonth !== null) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDept(null);
                  setSelectedCostCategory(null);
                  setSelectedMonth(null);
                }}
              >
                清除筛选
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportData} className="gap-1.5">
                <FileSpreadsheet className="size-4" />
                导出数据（财务对账用）
              </Button>
              <Button size="sm" onClick={handleExportPdf} className="gap-1.5">
                <FileDown className="size-4" />
                导出 PDF 报告
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <card.icon className="size-4.5" />
                        </div>
                        <Info className="size-4 text-muted-foreground hover:text-primary transition-colors" />
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">{card.title}</div>
                      <div className="text-2xl font-bold text-foreground tabular-nums">
                        {card.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{card.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{card.description}</div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base">{card.title} · 口径说明</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">计算公式</div>
                      <div className="text-sm text-foreground bg-muted/50 p-3 rounded-md font-mono">
                        {card.formula}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">数据来源</div>
                      <div className="text-sm text-foreground">{card.source}</div>
                    </div>
                  </div>
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">关闭</Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Efficiency trend - spans 2 cols */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                人效趋势
              </CardTitle>
              <CardDescription className="text-xs">
                12 个月人均产值年化趋势 {selectedMonth !== null && `· 已选 ${MONTHS[selectedMonth]}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={lineOption}
                theme="ud"
                className="h-[280px] w-full cursor-pointer"
                onEvents={{ click: handleLineChartClick }}
              />
            </CardContent>
          </Card>

          {/* Cost structure pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="size-4 text-primary" />
                成本结构
              </CardTitle>
              <CardDescription className="text-xs">
                点击扇区查看明细 {selectedCostCategory && `· 已选 ${selectedCostCategory}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={pieOption}
                theme="ud"
                className="h-[280px] w-full cursor-pointer"
                onEvents={{ click: handlePieChartClick }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Second chart row - bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                编制分布
              </CardTitle>
              <CardDescription className="text-xs">
                各部门年末编制人数对比，点击柱状图下钻查看岗位明细
                {selectedDept && ` · 已选 ${selectedDept}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={barOption}
                theme="ud"
                className="h-[280px] w-full cursor-pointer"
                onEvents={{ click: handleBarChartClick }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Detail table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">岗位明细</CardTitle>
                  <CardDescription className="text-xs">
                    共 {detailData.length} 条记录
                    {selectedDept && ` · ${selectedDept}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th
                        className="text-left font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('dept')}
                      >
                        部门 {sortField === 'dept' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">岗位名称</th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">职级</th>
                      <th
                        className="text-right font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('headcount')}
                      >
                        年末编制 {sortField === 'headcount' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-right font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('cost')}
                      >
                        年度成本 {sortField === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">月固定工资</th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">浮动比例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.slice(0, 20).map((p) => (
                      <tr key={p.id} className="border-t border-border/50 hover:bg-accent/20">
                        <td className="px-4 py-2.5 text-muted-foreground">{p.department}</td>
                        <td className="px-4 py-2.5 font-medium">{p.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p.level}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{p.endHeadcount}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{formatCurrency(p.totalCost)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{formatNumber(p.monthlyFixedSalary)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{(p.variableRatio * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detailData.length > 20 && (
                <div className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border/50">
                  显示前 20 条，共 {detailData.length} 条 · 完整数据请导出查看
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* PDF 打印专用容器：移出视口但保留尺寸，确保 echarts 正常渲染，打印时固定定位 */}
      <div className="pdf-print-wrapper">
        <style>{`
          .pdf-print-wrapper {
            position: fixed;
            left: -9999px;
            top: 0;
            width: 210mm;
            background: #fff;
            pointer-events: none;
          }
          @media print {
            .pdf-print-wrapper {
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              z-index: 99999;
            }
          }
        `}</style>
        {currentPlanData && (
          <ReportPdf
            planName={planList.find((p) => p.id === currentPlanId)?.name || '人力规划方案'}
            year={new Date().getFullYear()}
            scenarioName="当前方案"
            generatedAt={new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            metrics={metrics}
            positions={positions}
            costParams={costParams}
          />
        )}
      </div>
    </div>
  );
}
