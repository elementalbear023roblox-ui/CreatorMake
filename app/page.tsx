import { CreatorMakeEditor } from "@/components/editor/CreatorMakeEditor";
import { EditorErrorBoundary } from "@/components/editor/EditorErrorBoundary";
import { isCreatorMakeAIEnabled } from "@/lib/ai/feature";

export default function Home() {
  return <EditorErrorBoundary scope="CreatorMake"><CreatorMakeEditor aiEnabled={isCreatorMakeAIEnabled()} /></EditorErrorBoundary>;
}
