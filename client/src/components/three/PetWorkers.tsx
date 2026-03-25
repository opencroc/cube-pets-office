/**
 * Pet Workers — Cube pets working in the study room
 * Each pet has a role and animations:
 * - Cat: Typing at computer (CEO/主管)
 * - Dog: Reading on laptop (AI研究员)
 * - Bunny: Organizing books (图书管理员)
 * - Monkey: Discussing at coffee table (讨论者)
 * - Chick: Taking notes at coffee table (记录员)
 */
import { useGLTF, Html } from '@react-three/drei';
import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PET_MODELS } from '@/lib/assets';
import { useAppStore } from '@/lib/store';
import { useWorkflowStore } from '@/lib/workflow-store';

interface PetConfig {
  name: string;
  label: string;
  role: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  animationType: 'typing' | 'reading' | 'organizing' | 'discussing' | 'noting';
}

const PET_CONFIGS: PetConfig[] = [
  {
    name: 'cat',
    label: '猫咪主管',
    role: 'CEO — 负责战略方向与跨部门协调',
    url: PET_MODELS.cat,
    position: [-1.5, 1.05, -1.8],
    rotation: [0, Math.PI, 0],
    scale: 0.45,
    animationType: 'typing',
  },
  {
    name: 'dog',
    label: '狗狗研究员',
    role: 'AI部经理 — 分析论文与模型架构',
    url: PET_MODELS.dog,
    position: [2, 1.05, -1.8],
    rotation: [0, Math.PI, 0],
    scale: 0.45,
    animationType: 'reading',
  },
  {
    name: 'bunny',
    label: '兔兔管理员',
    role: '元部门 — 整理文献与知识库',
    url: PET_MODELS.bunny,
    position: [-3.5, 0, -1.5],
    rotation: [0, Math.PI / 2, 0],
    scale: 0.4,
    animationType: 'organizing',
  },
  {
    name: 'monkey',
    label: '猴子讨论家',
    role: '游戏部经理 — 讨论系统架构设计',
    url: PET_MODELS.monkey,
    position: [0.5, 0, 1.0],
    rotation: [0, Math.PI / 4, 0],
    scale: 0.4,
    animationType: 'discussing',
  },
  {
    name: 'chick',
    label: '小鸡记录员',
    role: '生活部Worker — 记录会议要点',
    url: PET_MODELS.chick,
    position: [1.5, 0, 1.0],
    rotation: [0, -Math.PI / 4, 0],
    scale: 0.35,
    animationType: 'noting',
  },
];

function SpeechBubble({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;

  return (
    <Html
      position={[0, 1.2, 0]}
      center
      distanceFactor={5}
      style={{ pointerEvents: 'none' }}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-[#E8DDD0] max-w-[180px] text-center animate-in fade-in duration-300">
        <p className="text-xs text-[#3A3A3A] leading-relaxed whitespace-pre-wrap">{text}</p>
        {/* Triangle pointer */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/95" />
      </div>
    </Html>
  );
}

function PetWorker({ config }: { config: PetConfig }) {
  const { scene } = useGLTF(config.url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const selectedPet = useAppStore((s) => s.selectedPet);
  const setSelectedPet = useAppStore((s) => s.setSelectedPet);
  const toggleChat = useAppStore((s) => s.toggleChat);
  const isChatOpen = useAppStore((s) => s.isChatOpen);

  // Map pet names to agent IDs for status integration
  const petToAgent: Record<string, string> = {
    cat: 'ceo',
    dog: 'nexus',
    bunny: 'warden',
    monkey: 'pixel',
    chick: 'echo',
  };

  const agentStatuses = useWorkflowStore((s) => s.agentStatuses);
  const agentStatus = agentStatuses[petToAgent[config.name]] || 'idle';

  const statusBubbles: Record<string, string> = {
    analyzing: '正在分析指令...\n让我想想谁来做这个',
    planning: '分配任务中...\n这个交给你做吧！',
    executing: '努力工作中...\n请稍等一下',
    reviewing: '让我看看这个交付物...\n认真评分中',
    auditing: '审计中...\n检查质量和合规性',
    revising: '根据反馈修改中...\n这次一定做得更好',
    verifying: '逐条确认中...\n看看反馈都回应了没',
    summarizing: '汇总报告中...\n准备向CEO汇报',
    evaluating: '评估各部门表现...\n总体做得不错！',
    thinking: '思考中...\n让我想想',
  };

  const bubbleTexts: Record<string, string> = {
    cat: '正在分析论文的组织镜像架构...\n层级委派真是个好主意！',
    dog: '这个多智能体系统用了18个Agent...\n意图放大比(IAR)很有意思',
    bunny: '让我把参考文献整理好...\n已经分类了23篇引用',
    monkey: '三层架构：CEO→经理→Worker\n跟真实公司一模一样！',
    chick: '记下来记下来！\n实验用了30个任务套件',
  };

  const handleClick = useCallback(() => {
    setSelectedPet(config.name);
    setShowBubble(true);
    if (!isChatOpen) {
      toggleChat();
    }
    setTimeout(() => setShowBubble(false), 4000);
  }, [config.name, setSelectedPet, toggleChat, isChatOpen]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    switch (config.animationType) {
      case 'typing': {
        // Subtle bobbing while typing
        groupRef.current.position.y = config.position[1] + Math.sin(t * 4) * 0.015;
        // Slight head tilt
        groupRef.current.rotation.z = Math.sin(t * 2) * 0.03;
        break;
      }
      case 'reading': {
        // Gentle swaying while reading
        groupRef.current.position.y = config.position[1] + Math.sin(t * 1.5) * 0.01;
        groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
        break;
      }
      case 'organizing': {
        // Walking back and forth
        const walkCycle = Math.sin(t * 0.8);
        groupRef.current.position.x = config.position[0] + walkCycle * 0.5;
        groupRef.current.position.y = config.position[1] + Math.abs(Math.sin(t * 1.6)) * 0.08;
        groupRef.current.rotation.y = walkCycle > 0 ? Math.PI / 2 : -Math.PI / 2;
        // Body wobble
        groupRef.current.rotation.z = Math.sin(t * 1.6) * 0.08;
        break;
      }
      case 'discussing': {
        // Animated head turning
        groupRef.current.rotation.y = config.position[2] > 0
          ? Math.PI / 4 + Math.sin(t * 1.2) * 0.3
          : -Math.PI / 4 + Math.sin(t * 1.2) * 0.3;
        // Slight bounce when "talking"
        groupRef.current.position.y = config.position[1] + Math.abs(Math.sin(t * 3)) * 0.03;
        break;
      }
      case 'noting': {
        // Quick small bobs (writing)
        groupRef.current.position.y = config.position[1] + Math.sin(t * 5) * 0.01;
        groupRef.current.rotation.x = Math.sin(t * 2.5) * 0.05;
        break;
      }
    }

    // Hover scale effect
    const targetScale = hovered ? config.scale * 1.15 : config.scale;
    const currentScale = groupRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    groupRef.current.scale.setScalar(newScale);
  });

  return (
    <group
      ref={groupRef}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <primitive object={cloned} />

      {/* Name label */}
      <Html
        position={[0, 1.8, 0]}
        center
        distanceFactor={6}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
          hovered || selectedPet === config.name
            ? 'bg-[#D4845A] text-white shadow-md scale-110'
            : 'bg-white/80 text-[#3A3A3A] shadow-sm'
        }`}>
          {config.label}
        </div>
      </Html>

      {/* Speech bubble — shows agent status when active, default text otherwise */}
      <SpeechBubble
        text={agentStatus !== 'idle' ? (statusBubbles[agentStatus] || `${agentStatus}...`) : (bubbleTexts[config.name] || '')}
        visible={showBubble || selectedPet === config.name || agentStatus !== 'idle'}
      />

      {/* Status indicator light */}
      {agentStatus !== 'idle' && (
        <pointLight
          position={[0, 1.5, 0]}
          intensity={0.5}
          color={agentStatus === 'executing' ? '#3B82F6' : agentStatus === 'reviewing' ? '#A855F7' : '#F59E0B'}
          distance={3}
          decay={2}
        />
      )}

      {/* Hover glow */}
      {hovered && (
        <pointLight
          position={[0, 0.5, 0]}
          intensity={0.3}
          color="#FFE4B5"
          distance={2}
          decay={2}
        />
      )}
    </group>
  );
}

export function PetWorkers() {
  return (
    <group>
      {PET_CONFIGS.map((config) => (
        <PetWorker key={config.name} config={config} />
      ))}
    </group>
  );
}

// Preload all pet models
Object.values(PET_MODELS).forEach((url) => {
  useGLTF.preload(url);
});
