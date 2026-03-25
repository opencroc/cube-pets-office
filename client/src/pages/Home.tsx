/**
 * Home Page — Cube Pets Office
 * Design: Scandinavian Warm Minimalism — Cozy Study Room
 * Full-screen 3D scene with overlay UI panels
 */
import { Scene3D } from '@/components/Scene3D';
import { PdfViewer } from '@/components/PdfViewer';
import { ConfigPanel } from '@/components/ConfigPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { Toolbar } from '@/components/Toolbar';
import { WorkflowPanel } from '@/components/WorkflowPanel';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const isSceneReady = useAppStore((s) => s.isSceneReady);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#E8E0D4] relative">
      {/* 3D Scene — always rendered, behind everything */}
      <Scene3D />

      {/* Loading overlay — covers everything until scene is ready */}
      {!isSceneReady && <LoadingScreen />}

      {/* UI Overlays — only shown when scene is ready */}
      {isSceneReady && (
        <>
          <Toolbar />
          <PdfViewer />
          <ConfigPanel />
          <ChatPanel />
          <WorkflowPanel />
        </>
      )}
    </div>
  );
}
