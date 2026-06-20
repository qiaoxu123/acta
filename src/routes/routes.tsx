import type { RouteObject } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { VenuesPage } from "@/features/venues/VenuesPage";
import { ReviewsPage } from "@/features/reviews/ReviewsPage";
import { PapersPage } from "@/features/papers/PapersPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "venues", element: <VenuesPage /> },
      { path: "venues/:id", element: <VenuesPage /> },
      { path: "reviews", element: <ReviewsPage /> },
      { path: "reviews/:id", element: <ReviewsPage /> },
      { path: "papers", element: <PapersPage /> },
      { path: "papers/:id", element: <PapersPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
];
