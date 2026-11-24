import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Clock, CheckCircle2, ArrowRight, Building2, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlan } from '@/context/PlanContext';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const navigate = useNavigate();
  const { planList, createPlan, setCurrentPlan, loadDemoData } = usePlan();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const handleCreateFromTemplate = (template: 'general' | 'service') => {
    const id = createPlan(template);
    setCurrentPlan(id);
    toast.success('方案已创建，开始规划');
    setShowTemplatePicker(false);
    navigate('/workbench');
  };

  const handleOpenDemo = () => {
    loadDemoData();
    navigate('/demo');
  };

  const handleContinuePlan = (id: string) => {
    setCurrentPlan(id);
    navigate('/workbench');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Hero / CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8 mb-16"
        >
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              10 分钟做一份
              <span className="text-primary"> 完整人力规划方案</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              导入 Excel 或套用模板，自动完成编制测算、成本预算与沙盘推演，数据联动实时可见。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => setShowTemplatePicker(true)}
              className="h-12 px-6 text-base gap-2"
            >
              <Plus className="size-5" />
              用模板，3 步做我的第一份方案
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleOpenDemo}
              className="h-12 px-6 text-base gap-2"
            >
              <Play className="size-5" />
              打开演示样例学习
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>内置模板</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              <span>编制测算</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" />
              <span>成本沙盘</span>
            </div>
          </div>
        </motion.div>

        {/* Template Picker Modal */}
        <AnimatePresence>
          {showTemplatePicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowTemplatePicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground">选择模板</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    模板预置了行业常见的岗位结构与参数，创建后可自由调整。
                  </p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleCreateFromTemplate('general')}
                    className="text-left p-5 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-all group"
                  >
                    <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Building2 className="size-5" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">通用模型</h3>
                    <p className="text-sm text-muted-foreground">
                      适用于大多数企业，包含技术、市场、销售、运营、人力、财务、行政等完整部门结构。
                    </p>
                    <div className="mt-3 flex items-center text-xs text-primary font-medium">
                      <span>立即创建</span>
                      <ArrowRight className="size-3.5 ml-1" />
                    </div>
                  </button>
                  <button
                    onClick={() => handleCreateFromTemplate('service')}
                    className="text-left p-5 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-all group"
                  >
                    <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Users className="size-5" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">通用服务业</h3>
                    <p className="text-sm text-muted-foreground">
                      适用于服务型企业，侧重销售、运营、客户成功等前台岗位，技术岗位精简配置。
                    </p>
                    <div className="mt-3 flex items-center text-xs text-primary font-medium">
                      <span>立即创建</span>
                      <ArrowRight className="size-3.5 ml-1" />
                    </div>
                  </button>
                </div>
                <div className="px-6 pb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplatePicker(false)}
                    className="w-full"
                  >
                    取消
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Plans Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">我的方案</h2>
            <Badge variant="outline" className="text-xs font-normal">
              共 {planList.length} 个
            </Badge>
          </div>

          {planList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="text-muted-foreground text-sm">
                  还没有方案，从上方按钮开始创建吧
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planList.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all h-full"
                    onClick={() => handleContinuePlan(plan.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium text-foreground truncate pr-2">
                          {plan.name}
                        </CardTitle>
                        <Badge
                          variant={plan.status === 'completed' ? 'default' : 'secondary'}
                          className={cn(
                            'shrink-0 text-xs',
                            plan.status === 'completed' && 'bg-primary/10 text-primary border border-primary/20',
                          )}
                        >
                          {plan.status === 'completed' ? (
                            <CheckCircle2 className="size-3 mr-1" />
                          ) : (
                            <Clock className="size-3 mr-1" />
                          )}
                          {plan.status === 'completed' ? '已完成' : '进行中'}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {plan.template === 'general' ? '通用模型' : '通用服务业'}模板
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>更新于 {formatDate(plan.updatedAt)}</span>
                        <span className="text-primary flex items-center gap-0.5 font-medium">
                          继续编辑 <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
