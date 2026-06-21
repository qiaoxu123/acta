import { Navigate, type RouteObject } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { VenuesPage } from "@/features/venues/VenuesPage";
import { VenueItemPage } from "@/features/venues/VenueItemPage";
import { ReviewsPage } from "@/features/reviews/ReviewsPage";
import { ReviewItemPage } from "@/features/reviews/ReviewItemPage";
import { PapersPage } from "@/features/papers/PapersPage";
import { PaperItemPage } from "@/features/papers/PaperItemPage";
import { PatentsPage } from "@/features/patents/PatentsPage";
import { PatentItemPage } from "@/features/patents/PatentItemPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectItemPage } from "@/features/projects/ProjectItemPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "journals", element: <VenuesPage kind="journal" /> },
      { path: "journals/item/:id", element: <VenueItemPage kind="journal" /> },
      { path: "journals/:id", element: <VenuesPage kind="journal" /> },
      { path: "conferences", element: <VenuesPage kind="conference" /> },
      { path: "conferences/item/:id", element: <VenueItemPage kind="conference" /> },
      { path: "conferences/:id", element: <VenuesPage kind="conference" /> },
      // Back-compat: the old combined route now lands on conferences.
      { path: "venues", element: <Navigate to="/conferences" replace /> },
      { path: "venues/:id", element: <Navigate to="/conferences" replace /> },
      { path: "reviews", element: <ReviewsPage /> },
      { path: "reviews/item/:id", element: <ReviewItemPage /> },
      { path: "reviews/:id", element: <ReviewsPage /> },
      { path: "papers", element: <PapersPage /> },
      { path: "papers/item/:id", element: <PaperItemPage /> },
      { path: "papers/:id", element: <PapersPage /> },
      { path: "patents", element: <PatentsPage /> },
      { path: "patents/item/:id", element: <PatentItemPage /> },
      { path: "patents/:id", element: <PatentsPage /> },
      { path: "projects/vertical", element: <ProjectsPage category="vertical" /> },
      { path: "projects/vertical/item/:id", element: <ProjectItemPage category="vertical" /> },
      { path: "projects/vertical/:id", element: <ProjectsPage category="vertical" /> },
      { path: "projects/horizontal", element: <ProjectsPage category="horizontal" /> },
      { path: "projects/horizontal/item/:id", element: <ProjectItemPage category="horizontal" /> },
      { path: "projects/horizontal/:id", element: <ProjectsPage category="horizontal" /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
];
