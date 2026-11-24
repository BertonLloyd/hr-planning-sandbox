import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import { PlanProvider } from '@/context/PlanContext';

export const Layout = () => {
  return (
    <PlanProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 w-full">
          <Outlet />
        </main>
      </div>
    </PlanProvider>
  );
};
