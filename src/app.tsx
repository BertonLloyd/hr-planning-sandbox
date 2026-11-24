import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import HomePage from "@/pages/HomePage/HomePage";
import WorkbenchPage from "@/pages/WorkbenchPage/WorkbenchPage";
import ReportCenterPage from "@/pages/ReportCenterPage/ReportCenterPage";
import DemoTourPage from "@/pages/DemoTourPage/DemoTourPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="workbench" element={<WorkbenchPage />} />
        <Route path="reports" element={<ReportCenterPage />} />
        <Route path="demo" element={<DemoTourPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
