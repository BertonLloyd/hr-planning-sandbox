import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/context/PlanContext';
import { cn } from '@/lib/utils';
import Step1TargetData from './steps/Step1TargetData';
import Step2Headcount from './steps/Step2Headcount';
import Step3Cost from './steps/Step3Cost';
import Step4Sandbox from './steps/Step4Sandbox';
import Step5Results from './steps/Step5Results';

const STEPS = [
  { key: 0, label: '目标与数据', desc: '设定目标，导入数据' },
  { key: 1, label: '编制测算', desc: '按部门岗位测算编制' },
  { key: 2, label: '成本测算', desc: '按月成本与参数调整' },
  { key: 3, label: '沙盘试算', desc: '多情景对比分析' },
  { key: 4, label: '查看结果', desc: '汇总与导出' },
];

export default function WorkbenchPage() {
  const navigate = useNavigate();
  const { currentPlanData, currentPlanId, setCurrentStep } = usePlan();

  const currentStep = currentPlanData?.currentStep ?? 0;

  // If no current plan, redirect to home
  useEffect(() => {
    if (!currentPlanId) {
      navigate('/');
    }
  }, [currentPlanId, navigate]);

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <Step1TargetData />;
      case 1:
        return <Step2Headcount />;
      case 2:
        return <Step3Cost />;
      case 3:
        return <Step4Sandbox />;
      case 4:
        return <Step5Results />;
      default:
        return null;
    }
  };

  if (!currentPlanData) return null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/30 flex flex-col">
      {/* Step Bar - sticky */}
      <div className="sticky top-14 z-40 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="text-muted-foreground"
              >
                <ArrowLeft className="size-4 mr-1" />
                返回首页
              </Button>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-1">
              {STEPS.map((step, index) => {
                const isActive = currentStep === step.key;
                const isCompleted = currentStep > step.key;
                return (
                  <button
                    key={step.key}
                    onClick={() => goToStep(step.key)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : isCompleted
                        ? 'text-foreground hover:bg-accent/50'
                        : 'text-muted-foreground hover:bg-accent/30',
                    )}
                  >
                    <span
                      className={cn(
                        'size-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isCompleted ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="hidden md:inline">{step.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2 w-48 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                上一步
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                disabled={currentStep === STEPS.length - 1}
              >
                下一步
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-w-[1440px] mx-auto px-6 py-6"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
