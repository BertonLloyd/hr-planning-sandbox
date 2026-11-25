import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { scopedStorage } from '@/lib/storage';
import type { IPlanData, IPlanMeta, IPosition, IScenario } from '@/data/mockPlanData';
import { MOCK_PLAN_DATA, MOCK_PLAN_LIST, MOCK_SCENARIOS, MOCK_POSITIONS } from '@/data/mockPlanData';

const PLAN_LIST_KEY = '__hp_plan_list';
const CURRENT_PLAN_KEY = '__hp_current_plan_id';
const PLAN_DATA_PREFIX = '__hp_plan_data_';
const SCENARIOS_PREFIX = '__hp_scenarios_';

interface PlanContextType {
  planList: IPlanMeta[];
  currentPlanId: string | null;
  currentPlanData: IPlanData | null;
  scenarios: IScenario[];
  createPlan: (template: 'general' | 'service', name?: string) => string;
  setCurrentPlan: (id: string) => void;
  updatePlanData: (updater: (data: IPlanData) => IPlanData) => void;
  updatePositions: (updater: (positions: IPosition[]) => IPosition[]) => void;
  updateCostParams: (params: Partial<IPlanData['costParams']>) => void;
  updateSandbox: (sandbox: Partial<IPlanData['sandbox']>) => void;
  baselineSandbox: IPlanData['sandbox'] | null;
  sandboxDraft: IPlanData['sandbox'] | null;
  resetSandboxToBaseline: () => void;
  applySandboxToPlan: () => void;
  updateTarget: (target: Partial<IPlanData['target']>) => void;
  setCurrentStep: (step: number) => void;
  saveScenario: (scenario: IScenario) => void;
  deleteScenario: (id: string) => void;
  deletePlan: (id: string) => void;
  loadDemoData: () => void;
  computeMetrics: (data?: IPlanData | null, sandboxVars?: IPlanData['sandbox'] | null) => Metrics;
}

export interface Metrics {
  totalHeadcount: number;
  totalCost: number;
  costRatio: number; // 人力成本率
  perCapitaOutput: number; // 人均产值
}

const PlanContext = createContext<PlanContextType | null>(null);

function getPlanDataKey(id: string) {
  return `${PLAN_DATA_PREFIX}${id}`;
}

function getScenariosKey(id: string) {
  return `${SCENARIOS_PREFIX}${id}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function computeTotalHeadcount(positions: IPosition[]): number {
  // Use the last month's headcount as total plan headcount
  let total = 0;
  for (const p of positions) {
    total += p.monthlyHeadcount[11];
  }
  return total;
}

function computeMonthlyCosts(positions: IPosition[], costParams: IPlanData['costParams']): number[] {
  const months: number[] = new Array(12).fill(0);
  for (const p of positions) {
    for (let m = 0; m < 12; m++) {
      const hc = p.monthlyHeadcount[m];
      const salaryMult = 1 + (costParams.salaryIncrease / 100) * (m / 11);
      const fixed = p.monthlyFixedSalary * salaryMult;
      const variable = fixed * p.variableRatio;
      const perPersonCost = fixed + variable + p.socialInsurance + p.welfare + p.specialCost;
      months[m] += perPersonCost * hc;
    }
  }
  // Adjust for turnover rate (replacement hiring costs)
  const turnoverAdjustment = 1 + (costParams.turnoverRate / 100) * 0.3;
  return months.map((m) => m * turnoverAdjustment);
}

function computeTotalCost(positions: IPosition[], costParams: IPlanData['costParams']): number {
  return computeMonthlyCosts(positions, costParams).reduce((a, b) => a + b, 0);
}

export function computeMetrics(data: IPlanData | null, sandboxVars?: IPlanData['sandbox'] | null): Metrics {
  if (!data) {
    return { totalHeadcount: 0, totalCost: 0, costRatio: 0, perCapitaOutput: 0 };
  }

  const variables = sandboxVars || data.sandbox;
  const efficiencyMult = 1 + (variables.efficiencyGain / 100);
  const salaryMult = 1 + (variables.salaryAdjustment / 100);
  const ratioMult = variables.ratio;

  const positions = data.positions.map((p) => ({
    ...p,
    monthlyHeadcount: p.monthlyHeadcount.map((h) => Math.round(h * ratioMult / efficiencyMult)),
    monthlyFixedSalary: p.monthlyFixedSalary * salaryMult,
  }));

  const totalHeadcount = computeTotalHeadcount(positions);
  const totalCost = computeTotalCost(positions, data.costParams);
  const revenueTarget = variables.revenueTarget || data.target.annualRevenue;
  const costRatio = revenueTarget > 0 ? (totalCost / revenueTarget) * 100 : 0;
  const perCapitaOutput = totalHeadcount > 0 ? revenueTarget / totalHeadcount : 0;

  return { totalHeadcount, totalCost, costRatio, perCapitaOutput };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [planList, setPlanList] = useState<IPlanMeta[]>(() => {
    const stored = scopedStorage.getItem(PLAN_LIST_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return MOCK_PLAN_LIST;
  });

  const [currentPlanId, setCurrentPlanId] = useState<string | null>(() => {
    return scopedStorage.getItem(CURRENT_PLAN_KEY) || null;
  });

  const [currentPlanData, setCurrentPlanData] = useState<IPlanData | null>(null);
  const [scenarios, setScenarios] = useState<IScenario[]>([]);
  const [sandboxDraft, setSandboxDraft] = useState<IPlanData['sandbox'] | null>(null);
  const [baselineSandbox, setBaselineSandbox] = useState<IPlanData['sandbox'] | null>(null);

  // Load plan data when currentPlanId changes
  useEffect(() => {
    if (!currentPlanId) {
      setCurrentPlanData(null);
      setScenarios([]);
      return;
    }
    const key = getPlanDataKey(currentPlanId);
    const stored = scopedStorage.getItem(key);
    if (stored) {
      try {
        setCurrentPlanData(JSON.parse(stored));
      } catch {
        setCurrentPlanData(deepClone(MOCK_PLAN_DATA));
      }
    } else {
      // First load of a new plan, use mock as base
      setCurrentPlanData(deepClone(MOCK_PLAN_DATA));
    }

    const skey = getScenariosKey(currentPlanId);
    const sstored = scopedStorage.getItem(skey);
    if (sstored) {
      try {
        setScenarios(JSON.parse(sstored));
      } catch {
        setScenarios(deepClone(MOCK_SCENARIOS));
      }
    } else {
      setScenarios(deepClone(MOCK_SCENARIOS));
    }

    // 初始化沙盘基线和草稿值：基于方案真实数据
    if (stored) {
      try {
        const data = JSON.parse(stored) as IPlanData;
        const baseline = computeBaselineSandbox(data);
        setBaselineSandbox(baseline);
        setSandboxDraft(baseline);
      } catch {
        const baseline = computeBaselineSandbox(deepClone(MOCK_PLAN_DATA));
        setBaselineSandbox(baseline);
        setSandboxDraft(baseline);
      }
    } else {
      const baseline = computeBaselineSandbox(deepClone(MOCK_PLAN_DATA));
      setBaselineSandbox(baseline);
      setSandboxDraft(baseline);
    }
  }, [currentPlanId]);

  // 计算基线沙盘变量：基于方案当前真实数据
  function computeBaselineSandbox(data: IPlanData): IPlanData['sandbox'] {
    return {
      revenueTarget: data.target.annualRevenue,
      efficiencyGain: 0, // 基线不设人效提升
      salaryAdjustment: data.costParams.salaryIncrease,
      ratio: 1.0,
    };
  }

  // 当方案数据变化（如目标、成本参数修改）时，同步更新基线
  useEffect(() => {
    if (!currentPlanData) return;
    const newBaseline = computeBaselineSandbox(currentPlanData);
    setBaselineSandbox(newBaseline);
    // 若草稿值与旧基线一致，说明用户没改过，也同步更新
    setSandboxDraft((prev) => {
      if (!prev) return newBaseline;
      return prev;
    });
  }, [currentPlanData?.target.annualRevenue, currentPlanData?.costParams.salaryIncrease]);
  useEffect(() => {
    scopedStorage.setItem(PLAN_LIST_KEY, JSON.stringify(planList));
  }, [planList]);

  // Persist current plan data
  useEffect(() => {
    if (currentPlanId && currentPlanData) {
      scopedStorage.setItem(getPlanDataKey(currentPlanId), JSON.stringify(currentPlanData));
    }
  }, [currentPlanId, currentPlanData]);

  // Persist scenarios
  useEffect(() => {
    if (currentPlanId && scenarios.length > 0) {
      scopedStorage.setItem(getScenariosKey(currentPlanId), JSON.stringify(scenarios));
    }
  }, [currentPlanId, scenarios]);

  // Persist current plan ID
  useEffect(() => {
    if (currentPlanId) {
      scopedStorage.setItem(CURRENT_PLAN_KEY, currentPlanId);
    }
  }, [currentPlanId]);

  const createPlan = useCallback((template: 'general' | 'service', name?: string) => {
    const id = `plan-${Date.now()}`;
    const planName = name || `${template === 'general' ? '通用模型' : '通用服务业'}方案`;
    const newMeta: IPlanMeta = {
      id,
      name: planName,
      template,
      status: 'draft',
      updatedAt: Date.now(),
    };
    setPlanList((prev) => [newMeta, ...prev]);
    setCurrentPlanId(id);

    // Initialize plan data based on template
    const baseData = deepClone(MOCK_PLAN_DATA);
    if (template === 'service') {
      // Service template: more frontline, fewer tech
      const servicePositions = baseData.positions.filter(
        (p) => !['技术部', '财务部'].includes(p.department),
      );
      baseData.positions = servicePositions;
      baseData.headcountParams.redLine = 100;
    }
    baseData.currentStep = 0;
    scopedStorage.setItem(getPlanDataKey(id), JSON.stringify(baseData));
    setCurrentPlanData(baseData);

    return id;
  }, []);

  const setCurrentPlan = useCallback((id: string) => {
    setCurrentPlanId(id);
  }, []);

  const updatePlanData = useCallback((updater: (data: IPlanData) => IPlanData) => {
    setCurrentPlanData((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      return updated;
    });
    // Update the plan list timestamp
    setPlanList((prev) =>
      prev.map((p) =>
        p.id === currentPlanId ? { ...p, updatedAt: Date.now(), status: 'draft' } : p,
      ),
    );
  }, [currentPlanId]);

  const updatePositions = useCallback((updater: (positions: IPosition[]) => IPosition[]) => {
    setCurrentPlanData((prev) => {
      if (!prev) return prev;
      return { ...prev, positions: updater(prev.positions) };
    });
    setPlanList((prev) =>
      prev.map((p) =>
        p.id === currentPlanId ? { ...p, updatedAt: Date.now(), status: 'draft' } : p,
      ),
    );
  }, [currentPlanId]);

  const updateCostParams = useCallback((params: Partial<IPlanData['costParams']>) => {
    setCurrentPlanData((prev) => {
      if (!prev) return prev;
      return { ...prev, costParams: { ...prev.costParams, ...params } };
    });
    setPlanList((prev) =>
      prev.map((p) =>
        p.id === currentPlanId ? { ...p, updatedAt: Date.now(), status: 'draft' } : p,
      ),
    );
  }, [currentPlanId]);

  const updateSandbox = useCallback((sandbox: Partial<IPlanData['sandbox']>) => {
    setSandboxDraft((prev) => {
      if (!prev) return { ...MOCK_PLAN_DATA.sandbox, ...sandbox };
      return { ...prev, ...sandbox };
    });
  }, []);

  const resetSandboxToBaseline = useCallback(() => {
    if (baselineSandbox) {
      setSandboxDraft(baselineSandbox);
    }
  }, [baselineSandbox]);

  const applySandboxToPlan = useCallback(() => {
    if (!sandboxDraft) return;
    setCurrentPlanData((prev) => {
      if (!prev) return prev;
      return { ...prev, sandbox: sandboxDraft };
    });
    setPlanList((prev) =>
      prev.map((p) =>
        p.id === currentPlanId ? { ...p, updatedAt: Date.now(), status: 'draft' } : p,
      ),
    );
    setBaselineSandbox(sandboxDraft);
  }, [sandboxDraft, currentPlanId]);

  const updateTarget = useCallback((target: Partial<IPlanData['target']>) => {
    setCurrentPlanData((prev) => {
      if (!prev) return prev;
      return { ...prev, target: { ...prev.target, ...target } };
    });
    setPlanList((prev) =>
      prev.map((p) =>
        p.id === currentPlanId ? { ...p, updatedAt: Date.now(), status: 'draft' } : p,
      ),
    );
  }, [currentPlanId]);

  const setCurrentStep = useCallback((step: number) => {
    setCurrentPlanData((prev) => {
      if (!prev) return prev;
      return { ...prev, currentStep: step };
    });
  }, []);

  const saveScenario = useCallback((scenario: IScenario) => {
    setScenarios((prev) => {
      const existing = prev.findIndex((s) => s.id === scenario.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = scenario;
        return updated;
      }
      return [...prev, scenario];
    });
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const deletePlan = useCallback((id: string) => {
    // 级联清理：删除该方案的明细数据与情景，避免留下孤儿数据
    scopedStorage.removeItem(getPlanDataKey(id));
    scopedStorage.removeItem(getScenariosKey(id));

    const remaining = planList.filter((p) => p.id !== id);
    setPlanList(remaining);

    // 若删除的是当前方案，指针切到剩余第一个；没有剩余则清空
    if (id === currentPlanId) {
      if (remaining.length > 0) {
        setCurrentPlanId(remaining[0].id);
      } else {
        setCurrentPlanId(null);
        // currentPlanId 持久化 effect 只在有值时写入，置空需手动删除，避免刷新后回退到演示数据
        scopedStorage.removeItem(CURRENT_PLAN_KEY);
      }
    }
  }, [planList, currentPlanId]);

  const loadDemoData = useCallback(() => {
    const demoId = 'plan-demo';
    const demoName = '演示样例方案';
    // Check if demo plan exists, if not create it
    const existing = planList.find((p) => p.id === demoId);
    if (!existing) {
      const demoMeta: IPlanMeta = {
        id: demoId,
        name: demoName,
        template: 'general',
        status: 'draft',
        updatedAt: Date.now(),
      };
      setPlanList((prev) => [demoMeta, ...prev]);
    }
    setCurrentPlanId(demoId);
    const demoData = deepClone(MOCK_PLAN_DATA);
    demoData.currentStep = 0;
    scopedStorage.setItem(getPlanDataKey(demoId), JSON.stringify(demoData));
    setCurrentPlanData(demoData);
    setScenarios(deepClone(MOCK_SCENARIOS));
  }, [planList]);

  const value: PlanContextType = {
    planList,
    currentPlanId,
    currentPlanData,
    scenarios,
    createPlan,
    setCurrentPlan,
    updatePlanData,
    updatePositions,
    updateCostParams,
    updateSandbox,
    baselineSandbox,
    sandboxDraft,
    resetSandboxToBaseline,
    applySandboxToPlan,
    updateTarget,
    setCurrentStep,
    saveScenario,
    deleteScenario,
    deletePlan,
    loadDemoData,
    computeMetrics: (data, sandboxVars) => computeMetrics(data || currentPlanData, sandboxVars),
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return ctx;
}

export { computeMonthlyCosts, computeTotalHeadcount, computeTotalCost };
