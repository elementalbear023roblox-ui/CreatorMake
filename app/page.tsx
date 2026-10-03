import { CreatorMakeEditor } from "@/components/editor/CreatorMakeEditor";
import { isCreatorMakeAIEnabled } from "@/lib/ai/feature";

export default function Home() {
  return <CreatorMakeEditor aiEnabled={isCreatorMakeAIEnabled()} />;
}
