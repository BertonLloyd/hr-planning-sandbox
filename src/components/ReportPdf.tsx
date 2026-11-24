import { useMemo, useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/format';
import { MONTHS, type IPosition, type IPlanData } from '@/data/mockPlanData';
import { computeMonthlyCosts, type Metrics } from '@/context/PlanContext';

interface ReportPdfProps {
  planName: string;
  year: number;
  scenarioName: string;
  generatedAt: string;
  metrics: Metrics;
  positions: IPosition[];
  costParams: IPlanData['costParams'];
}

const CHART_PALETTE = [
  '#0A6FA8',
  '#1E90C0',
  '#35B1CC',
  '#0D8B7A',
  '#2A7AB3',
  '#4A9DD8',
  '#6BC4D6',
  '#0075A0',
];

export default function ReportPdf({
  planName,
  year,
  scenarioName,
  generatedAt,
  metrics,
  positions,
  costParams,
}: ReportPdfProps) {
  const [chartsReady, setChartsReady] = useState(false);
  const chartRefs = useRef<ReactECharts[]>([]);

  const monthlyCosts = useMemo(
    () => computeMonthlyCosts(positions, costParams),
    [positions, costParams],
  );

  const totalAnnualCost = useMemo(
    () => monthlyCosts.reduce((a, b) => a + b, 0),
    [monthlyCosts],
  );

  const deptSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of positions) {
      const hc = p.monthlyHeadcount[11] || 0;
      map.set(p.department, (map.get(p.department) || 0) + hc);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [positions]);

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
    return {
      fixed: fixed * turnoverMult,
      variable: variable * turnoverMult,
      social: social * turnoverMult,
      welfare: welfare * turnoverMult,
      special: special * turnoverMult,
    };
  }, [positions, costParams]);

  const detailData = useMemo(() => {
    return positions.map((p) => {
      let totalCost = 0;
      for (let m = 0; m < 12; m++) {
        const hc = p.monthlyHeadcount[m];
        const salaryMult = 1 + (costParams.salaryIncrease / 100) * (m / 11);
        const perPerson = p.monthlyFixedSalary * salaryMult * (1 + p.variableRatio)
          + p.socialInsurance + p.welfare + p.specialCost;
        totalCost += perPerson * hc;
      }
      const turnoverMult = 1 + (costParams.turnoverRate / 100) * 0.3;
      return {
        ...p,
        endHeadcount: p.monthlyHeadcount[11],
        totalCost: totalCost * turnoverMult,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }, [positions, costParams]);

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const headcountPieOption = useMemo(() => ({
    color: CHART_PALETTE,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 人 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#4B5563' },
    },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: false,
      },
      emphasis: {
        label: { show: false },
      },
      data: deptSummary.map(([name, value]) => ({ name, value })),
    }],
  }), [deptSummary]);

  const costPieOption = useMemo(() => ({
    color: CHART_PALETTE,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11, color: '#4B5563' },
    },
    series: [{
      type: 'pie',
      radius: ['50%', '72%'],
      center: ['70%', '50%'],
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: { show: false },
      emphasis: { label: { show: false } },
      data: [
        { name: '固定工资', value: Math.round(costStructure.fixed) },
        { name: '浮动工资', value: Math.round(costStructure.variable) },
        { name: '社保公积金', value: Math.round(costStructure.social) },
        { name: '福利费用', value: Math.round(costStructure.welfare) },
        { name: '专项费用', value: Math.round(costStructure.special) },
      ],
    }],
  }), [costStructure]);

  const monthlyBarOption = useMemo(() => ({
    color: CHART_PALETTE[0],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>成本：¥${formatNumber(p.value)}`;
      },
    },
    grid: {
      left: 60,
      right: 20,
      top: 20,
      bottom: 30,
    },
    xAxis: {
      type: 'category',
      data: MONTHS,
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { fontSize: 11, color: '#6B7280' },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#F3F4F6' } },
      axisLabel: {
        fontSize: 11,
        color: '#6B7280',
        formatter: (v: number) => {
          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
          if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
          return String(v);
        },
      },
    },
    series: [{
      type: 'bar',
      data: monthlyCosts.map((c) => Math.round(c)),
      barWidth: '55%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
      },
    }],
  }), [monthlyCosts]);

  const setChartRef = (idx: number) => (instance: ReactECharts | null) => {
    if (instance) chartRefs.current[idx] = instance;
  };

  return (
    <div className="report-pdf-container">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .report-pdf-container {
            visibility: visible;
            position: absolute !important;
            left: 0;
            top: 0;
            width: 100%;
            z-index: 99999;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .report-pdf-container * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            forced-color-adjust: none !important;
          }
          .report-pdf-container canvas {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            forced-color-adjust: none !important;
            image-rendering: -webkit-optimize-contrast;
          }
          .report-page {
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
          }
          .report-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .report-chart-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .detail-table thead {
            display: table-header-group;
          }
          .detail-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 18mm 16mm;
          }
        }
      `}</style>

      <div className="report-page space-y-5">
        <div className="border-b-2 border-primary pb-3">
          <div className="text-xs text-muted-foreground mb-1">人力资源规划报告</div>
          <h1 className="text-2xl font-bold text-foreground">{planName}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {year} 年度 · {scenarioName} · 生成日期：{generatedAt}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-2.5">关键指标</h2>
          <div className="grid grid-cols-4 gap-2.5">
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">编制总数</div>
              <div className="text-xl font-bold text-foreground tabular-nums">
                {formatNumber(metrics.totalHeadcount)}
                <span className="text-sm font-normal text-muted-foreground ml-1">人</span>
              </div>
            </div>
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">成本预算（年度）</div>
              <div className="text-xl font-bold text-foreground tabular-nums">
                ¥{formatCurrency(metrics.totalCost)}
              </div>
            </div>
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">人力成本率</div>
              <div className="text-xl font-bold text-foreground tabular-nums">
                {formatPercent(metrics.costRatio)}
              </div>
            </div>
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">人均产值</div>
              <div className="text-xl font-bold text-foreground tabular-nums">
                ¥{formatCurrency(metrics.perCapitaOutput)}
              </div>
            </div>
          </div>
        </div>

        <div className="report-chart-block">
          <h2 className="text-base font-semibold text-foreground mb-2.5">编制分布（按部门）</h2>
          <div className="border border-border rounded-lg p-2 bg-card">
            <div style={{ height: '260px', width: '100%' }}>
              <ReactECharts
                ref={setChartRef(0)}
                option={headcountPieOption}
                opts={{ renderer: 'svg' }}
                style={{ height: '100%', width: '100%' }}
                notMerge
                lazyUpdate={false}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="report-page space-y-5">
        <div className="report-chart-block">
          <h2 className="text-base font-semibold text-foreground mb-2.5">成本结构</h2>
          <div className="border border-border rounded-lg p-2 bg-card">
            <div style={{ height: '240px', width: '100%' }}>
              <ReactECharts
                ref={setChartRef(1)}
                option={costPieOption}
                opts={{ renderer: 'svg' }}
                style={{ height: '100%', width: '100%' }}
                notMerge
                lazyUpdate={false}
              />
            </div>
          </div>
        </div>

        <div className="report-chart-block">
          <h2 className="text-base font-semibold text-foreground mb-2.5">月度成本现金流</h2>
          <div className="border border-border rounded-lg p-2 bg-card">
            <div style={{ height: '240px', width: '100%' }}>
              <ReactECharts
                ref={setChartRef(2)}
                option={monthlyBarOption}
                opts={{ renderer: 'svg' }}
                style={{ height: '100%', width: '100%' }}
                notMerge
                lazyUpdate={false}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5 px-1">
            <span>最低月：¥{formatCurrency(Math.min(...monthlyCosts))}</span>
            <span>年度合计：<span className="font-semibold text-foreground">¥{formatCurrency(totalAnnualCost)}</span></span>
            <span>最高月：¥{formatCurrency(Math.max(...monthlyCosts))}</span>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-2.5">人效指标</h2>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">营收目标</div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                ¥{formatCurrency(metrics.totalCost / metrics.costRatio * 100)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">基于人力成本率反推</div>
            </div>
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">人均产值</div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                ¥{formatCurrency(metrics.perCapitaOutput)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">营收 / 编制数</div>
            </div>
            <div className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">人均人力成本</div>
              <div className="text-lg font-bold text-foreground tabular-nums">
                ¥{formatCurrency(metrics.totalCost / Math.max(1, metrics.totalHeadcount))}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">年度成本 / 编制数</div>
            </div>
          </div>
        </div>
      </div>

      <div className="report-page">
        <h2 className="text-base font-semibold text-foreground mb-2.5">岗位编制与成本明细</h2>
        <table className="detail-table w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground border-b border-border">部门</th>
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground border-b border-border">岗位名称</th>
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground border-b border-border">职级</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border-b border-border">年末编制</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border-b border-border">月固定工资</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border-b border-border">浮动比例</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border-b border-border">年度成本</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border-b border-border">占比</th>
            </tr>
          </thead>
          <tbody>
            {detailData.map((p, idx) => {
              const pct = totalAnnualCost > 0 ? (p.totalCost / totalAnnualCost) * 100 : 0;
              return (
                <tr key={p.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                  <td className="px-2 py-1.5 border-b border-border/50 text-foreground">{p.department}</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-foreground">{p.name}</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-muted-foreground">{p.level}</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-right tabular-nums text-foreground">{formatNumber(p.endHeadcount)}</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-right tabular-nums text-foreground">¥{formatCurrency(p.monthlyFixedSalary)}</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-right tabular-nums text-foreground">{(p.variableRatio * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-right tabular-nums font-medium text-foreground">¥{formatCurrency(p.totalCost)}</td>
                  <td className="px-2 py-1.5 border-b border-border/50 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
            <tr className="bg-primary/5 font-semibold">
              <td className="px-2 py-2 border-t-2 border-primary/30" colSpan={3}>合计</td>
              <td className="px-2 py-2 border-t-2 border-primary/30 text-right tabular-nums text-foreground">{formatNumber(metrics.totalHeadcount)}</td>
              <td className="px-2 py-2 border-t-2 border-primary/30 text-right" colSpan={2}></td>
              <td className="px-2 py-2 border-t-2 border-primary/30 text-right tabular-nums text-foreground">¥{formatCurrency(totalAnnualCost)}</td>
              <td className="px-2 py-2 border-t-2 border-primary/30 text-right tabular-nums text-foreground">100.0%</td>
            </tr>
          </tbody>
        </table>
        <div className="text-xs text-muted-foreground mt-3">
          共 {detailData.length} 条岗位记录 · {generatedAt} 生成
        </div>
        <div className="mt-4 text-xs text-muted-foreground space-y-1 leading-relaxed bg-muted/30 rounded-lg p-3">
          <p className="font-medium text-foreground mb-1">计算口径说明</p>
          <p>· 编制总数：取第 12 个月月末规划人数</p>
          <p>· 成本预算：12 个月人力成本合计，含固定工资、浮动工资、雇主社保公积金、福利费用、专项费用；已计入流动率影响</p>
          <p>· 人力成本率：年度成本 / 年度营收目标 × 100%</p>
          <p>· 人均产值：年度营收目标 / 年末编制数</p>
        </div>
      </div>
    </div>
  );
}
