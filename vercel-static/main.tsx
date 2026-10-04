import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import "@/app/interface-themes.css";
import { CreatorMakeEditor } from "@/components/editor/CreatorMakeEditor";
import { EditorErrorBoundary } from "@/components/editor/EditorErrorBoundary";

const root = document.getElementById("root");

if (!root) throw new Error("CreatorMake could not find its application root.");

createRoot(root).render(<EditorErrorBoundary scope="CreatorMake"><CreatorMakeEditor aiEnabled={false} /></EditorErrorBoundary>);
