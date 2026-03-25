/**
 * Loading Screen — Shown while 3D scene loads
 * Design: Warm minimalist with cute pet animation
 */
import { useAppStore } from '@/lib/store';

export function LoadingScreen() {
  const loadingProgress = useAppStore((s) => s.loadingProgress);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#FFF8F0] via-[#FFF5EC] to-[#F0E8E0] flex flex-col items-center justify-center">
      {/* Animated pet silhouette */}
      <div className="relative mb-8">
        <div
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#D4A57A] to-[#C4956A] shadow-lg relative"
          style={{
            animation: 'petBounce 1.2s ease-in-out infinite',
          }}
        >
          {/* Eyes */}
          <div className="absolute top-6 left-4 w-2.5 h-3 bg-white rounded-full" />
          <div className="absolute top-6 right-4 w-2.5 h-3 bg-white rounded-full" />
          {/* Pupils */}
          <div
            className="absolute top-7 left-5 w-1.5 h-1.5 bg-[#3A2A1A] rounded-full"
            style={{ animation: 'lookAround 3s ease-in-out infinite' }}
          />
          <div
            className="absolute top-7 right-5 w-1.5 h-1.5 bg-[#3A2A1A] rounded-full"
            style={{ animation: 'lookAround 3s ease-in-out infinite' }}
          />
          {/* Mouth */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3 h-1.5 border-b-2 border-[#3A2A1A] rounded-b-full" />
          {/* Ears */}
          <div className="absolute -top-2.5 left-2 w-4 h-4 bg-[#D4A57A] rounded-tl-xl rounded-tr-sm rotate-[-15deg]" />
          <div className="absolute -top-2.5 right-2 w-4 h-4 bg-[#D4A57A] rounded-tl-sm rounded-tr-xl rotate-[15deg]" />
        </div>

        {/* Shadow */}
        <div
          className="w-16 h-3 mx-auto mt-2 bg-[#D4B896]/30 rounded-full"
          style={{ animation: 'shadowPulse 1.2s ease-in-out infinite' }}
        />
      </div>

      {/* Title */}
      <h2
        className="text-xl font-bold text-[#3A2A1A] mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        正在布置书房...
      </h2>
      <p className="text-sm text-[#8B7355] mb-6">
        小宠物们正在搬家具 {Math.round(loadingProgress)}%
      </p>

      {/* Progress bar */}
      <div className="w-56 h-2 bg-[#E8DDD0] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C4956A] to-[#D4845A] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>

      <style>{`
        @keyframes petBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: scaleX(1); opacity: 0.3; }
          50% { transform: scaleX(0.7); opacity: 0.15; }
        }
        @keyframes lookAround {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(2px); }
          75% { transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}
