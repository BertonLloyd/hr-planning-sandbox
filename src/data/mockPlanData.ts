// EXPORTS: IPosition, IPlanData, IPlanMeta, IScenario, MOCK_POSITIONS, MOCK_PLAN_DATA, MOCK_PLAN_LIST, MOCK_SCENARIOS

export interface IPosition {
  id: string;
  department: string;
  name: string;
  level: string;
  currentHeadcount: number;
  monthlyHeadcount: number[]; // 12 months
  monthlyFixedSalary: number;
  variableRatio: number; // e.g. 0.25 = 25%
  socialInsurance: number; // monthly per person
  welfare: number; // monthly per person
  specialCost: number; // monthly per person
  expectedArrivalMonth: number; // 1-12
  calcMethod?: string;
}

export interface IPlanData {
  target: {
    annualRevenue: number;
  };
  positions: IPosition[];
  headcountParams: {
    redLine: number;
    defaultMethod: string;
  };
  costParams: {
    arrivalMonth: number;
    salaryIncrease: number;
    turnoverRate: number;
  };
  sandbox: {
    revenueTarget: number;
    efficiencyGain: number;
    salaryAdjustment: number;
    ratio: number;
  };
  currentStep: number;
}

export interface IPlanMeta {
  id: string;
  name: string;
  template: 'general' | 'service';
  status: 'draft' | 'completed';
  updatedAt: number;
}

export interface IScenario {
  id: string;
  name: string;
  type: 'optimistic' | 'neutral' | 'pessimistic' | 'custom';
  variables: {
    revenueTarget: number;
    efficiencyGain: number;
    salaryAdjustment: number;
    ratio: number;
  };
}

const DEPARTMENTS = ['技术部', '市场部', '销售部', '运营部', '人力资源部', '财务部', '行政部'];

function genHeadcount(base: number, growth: number, arrivalMonth: number): number[] {
  const arr: number[] = [];
  for (let m = 1; m <= 12; m++) {
    if (m < arrivalMonth) {
      arr.push(base);
    } else {
      const increment = Math.round(growth * (m - arrivalMonth + 1) / (13 - arrivalMonth));
      arr.push(base + increment);
    }
  }
  return arr;
}

export const MOCK_POSITIONS: IPosition[] = [
  // 技术部
  { id: 'p1', department: '技术部', name: '前端开发工程师', level: 'P5', currentHeadcount: 8,
    monthlyHeadcount: genHeadcount(8, 4, 3), monthlyFixedSalary: 22000, variableRatio: 0.2,
    socialInsurance: 6600, welfare: 800, specialCost: 500, expectedArrivalMonth: 3, calcMethod: 'revenue' },
  { id: 'p2', department: '技术部', name: '后端开发工程师', level: 'P6', currentHeadcount: 10,
    monthlyHeadcount: genHeadcount(10, 5, 2), monthlyFixedSalary: 28000, variableRatio: 0.25,
    socialInsurance: 8400, welfare: 800, specialCost: 800, expectedArrivalMonth: 2, calcMethod: 'revenue' },
  { id: 'p3', department: '技术部', name: '测试工程师', level: 'P5', currentHeadcount: 4,
    monthlyHeadcount: genHeadcount(4, 2, 4), monthlyFixedSalary: 18000, variableRatio: 0.15,
    socialInsurance: 5400, welfare: 800, specialCost: 300, expectedArrivalMonth: 4, calcMethod: 'ratio' },
  { id: 'p4', department: '技术部', name: '产品经理', level: 'P6', currentHeadcount: 3,
    monthlyHeadcount: genHeadcount(3, 2, 3), monthlyFixedSalary: 28000, variableRatio: 0.3,
    socialInsurance: 8400, welfare: 800, specialCost: 600, expectedArrivalMonth: 3, calcMethod: 'ratio' },
  { id: 'p5', department: '技术部', name: '技术经理', level: 'M2', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 6), monthlyFixedSalary: 45000, variableRatio: 0.4,
    socialInsurance: 13500, welfare: 1200, specialCost: 150, expectedArrivalMonth: 6, calcMethod: 'span' },
  // 市场部
  { id: 'p6', department: '市场部', name: '市场专员', level: 'P4', currentHeadcount: 5,
    monthlyHeadcount: genHeadcount(5, 3, 2), monthlyFixedSalary: 12000, variableRatio: 0.2,
    socialInsurance: 3600, welfare: 600, specialCost: 200, expectedArrivalMonth: 2, calcMethod: 'revenue' },
  { id: 'p7', department: '市场部', name: '市场经理', level: 'M1', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 5), monthlyFixedSalary: 28000, variableRatio: 0.35,
    socialInsurance: 8400, welfare: 800, specialCost: 700, expectedArrivalMonth: 5, calcMethod: 'span' },
  { id: 'p8', department: '市场部', name: '品牌专员', level: 'P4', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 4), monthlyFixedSalary: 14000, variableRatio: 0.2,
    socialInsurance: 4200, welfare: 600, specialCost: 300, expectedArrivalMonth: 4, calcMethod: 'ratio' },
  { id: 'p9', department: '市场部', name: '数字营销专员', level: 'P5', currentHeadcount: 3,
    monthlyHeadcount: genHeadcount(3, 2, 3), monthlyFixedSalary: 16000, variableRatio: 0.25,
    socialInsurance: 4800, welfare: 600, specialCost: 400, expectedArrivalMonth: 3, calcMethod: 'revenue' },
  // 销售部
  { id: 'p10', department: '销售部', name: '销售代表', level: 'P4', currentHeadcount: 12,
    monthlyHeadcount: genHeadcount(12, 8, 1), monthlyFixedSalary: 10000, variableRatio: 0.5,
    socialInsurance: 3000, welfare: 500, specialCost: 300, expectedArrivalMonth: 1, calcMethod: 'revenue' },
  { id: 'p11', department: '销售部', name: '销售经理', level: 'M1', currentHeadcount: 3,
    monthlyHeadcount: genHeadcount(3, 2, 4), monthlyFixedSalary: 25000, variableRatio: 0.45,
    socialInsurance: 7500, welfare: 800, specialCost: 800, expectedArrivalMonth: 4, calcMethod: 'span' },
  { id: 'p12', department: '销售部', name: '大客户销售', level: 'P6', currentHeadcount: 4,
    monthlyHeadcount: genHeadcount(4, 3, 2), monthlyFixedSalary: 20000, variableRatio: 0.5,
    socialInsurance: 6000, welfare: 800, specialCost: 600, expectedArrivalMonth: 2, calcMethod: 'revenue' },
  { id: 'p13', department: '销售部', name: '销售支持', level: 'P3', currentHeadcount: 3,
    monthlyHeadcount: genHeadcount(3, 1, 5), monthlyFixedSalary: 9000, variableRatio: 0.1,
    socialInsurance: 2700, welfare: 500, specialCost: 100, expectedArrivalMonth: 5, calcMethod: 'ratio' },
  // 运营部
  { id: 'p14', department: '运营部', name: '运营专员', level: 'P4', currentHeadcount: 6,
    monthlyHeadcount: genHeadcount(6, 4, 2), monthlyFixedSalary: 12000, variableRatio: 0.2,
    socialInsurance: 3600, welfare: 600, specialCost: 200, expectedArrivalMonth: 2, calcMethod: 'revenue' },
  { id: 'p15', department: '运营部', name: '运营经理', level: 'M1', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 5), monthlyFixedSalary: 25000, variableRatio: 0.3,
    socialInsurance: 7500, welfare: 800, specialCost: 600, expectedArrivalMonth: 5, calcMethod: 'span' },
  { id: 'p16', department: '运营部', name: '客户成功专员', level: 'P4', currentHeadcount: 4,
    monthlyHeadcount: genHeadcount(4, 3, 3), monthlyFixedSalary: 11000, variableRatio: 0.2,
    socialInsurance: 3300, welfare: 600, specialCost: 250, expectedArrivalMonth: 3, calcMethod: 'ratio' },
  // 人力资源部
  { id: 'p17', department: '人力资源部', name: 'HRBP', level: 'P5', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 6), monthlyFixedSalary: 18000, variableRatio: 0.15,
    socialInsurance: 5400, welfare: 800, specialCost: 400, expectedArrivalMonth: 6, calcMethod: 'ratio' },
  { id: 'p18', department: '人力资源部', name: '招聘专员', level: 'P4', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 3), monthlyFixedSalary: 10000, variableRatio: 0.15,
    socialInsurance: 3000, welfare: 500, specialCost: 200, expectedArrivalMonth: 3, calcMethod: 'ratio' },
  { id: 'p19', department: '人力资源部', name: '薪酬绩效专员', level: 'P4', currentHeadcount: 1,
    monthlyHeadcount: genHeadcount(1, 1, 7), monthlyFixedSalary: 13000, variableRatio: 0.15,
    socialInsurance: 3900, welfare: 600, specialCost: 200, expectedArrivalMonth: 7, calcMethod: 'ratio' },
  // 财务部
  { id: 'p20', department: '财务部', name: '会计', level: 'P4', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 4), monthlyFixedSalary: 12000, variableRatio: 0.1,
    socialInsurance: 3600, welfare: 600, specialCost: 150, expectedArrivalMonth: 4, calcMethod: 'ratio' },
  { id: 'p21', department: '财务部', name: '财务经理', level: 'M1', currentHeadcount: 1,
    monthlyHeadcount: genHeadcount(1, 0, 1), monthlyFixedSalary: 30000, variableRatio: 0.2,
    socialInsurance: 9000, welfare: 1000, specialCost: 500, expectedArrivalMonth: 1, calcMethod: 'span' },
  // 行政部
  { id: 'p22', department: '行政部', name: '行政专员', level: 'P3', currentHeadcount: 2,
    monthlyHeadcount: genHeadcount(2, 1, 2), monthlyFixedSalary: 8000, variableRatio: 0.1,
    socialInsurance: 2400, welfare: 500, specialCost: 100, expectedArrivalMonth: 2, calcMethod: 'ratio' },
];

export const MOCK_PLAN_DATA: IPlanData = {
  target: {
    annualRevenue: 120000000,
  },
  positions: MOCK_POSITIONS,
  headcountParams: {
    redLine: 120,
    defaultMethod: 'revenue',
  },
  costParams: {
    arrivalMonth: 3,
    salaryIncrease: 5,
    turnoverRate: 15,
  },
  sandbox: {
    revenueTarget: 120000000,
    efficiencyGain: 5,
    salaryAdjustment: 5,
    ratio: 1.0,
  },
  currentStep: 0,
};

export const MOCK_PLAN_LIST: IPlanMeta[] = [
  {
    id: 'plan-demo-1',
    name: '2025年度人力规划方案',
    template: 'general',
    status: 'draft',
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'plan-demo-2',
    name: '销售团队扩编测算',
    template: 'service',
    status: 'draft',
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'plan-demo-3',
    name: 'Q1成本预算方案',
    template: 'general',
    status: 'completed',
    updatedAt: Date.now() - 86400000 * 10,
  },
];

export const MOCK_SCENARIOS: IScenario[] = [
  {
    id: 'scenario-optimistic',
    name: '乐观情景',
    type: 'optimistic',
    variables: {
      revenueTarget: 150000000,
      efficiencyGain: 10,
      salaryAdjustment: 3,
      ratio: 0.95,
    },
  },
  {
    id: 'scenario-neutral',
    name: '中性情景',
    type: 'neutral',
    variables: {
      revenueTarget: 120000000,
      efficiencyGain: 5,
      salaryAdjustment: 5,
      ratio: 1.0,
    },
  },
  {
    id: 'scenario-pessimistic',
    name: '悲观情景',
    type: 'pessimistic',
    variables: {
      revenueTarget: 90000000,
      efficiencyGain: 2,
      salaryAdjustment: 8,
      ratio: 1.1,
    },
  },
];

export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const CALC_METHODS = [
  { value: 'revenue', label: '按人均产值倒推', description: '根据年度营收目标和目标人效，倒推所需编制' },
  { value: 'ratio', label: '按配比', description: '按部门/岗位间的固定配比关系推算' },
  { value: 'span', label: '按管理幅度', description: '按管理者直接下属数量推算管理岗编制' },
];
