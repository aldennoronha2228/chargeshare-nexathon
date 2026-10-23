import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowRight, ChevronDown, ChevronUp, Zap, Eye } from 'lucide-react';
import { detectSoftwareGl, setupSceneLighting } from '../three/SceneLighting';
import { createChargerModel, type ChargerVisualState } from '../three/ChargerModel';
import { createNeighbourhoodScene } from '../three/NeighbourhoodScene';
import {
  ScrollSceneController,
  CHAPTER_KEYFRAMES,
  ORDERED_CHAPTERS,
  type StoryChapterId,
} from '../three/ScrollSceneController';
import { HeroDrivewayIllustration } from './EditorialIllustrations';

interface HeroSceneProps {
  activeChapter: StoryChapterId;
  chargerState: ChargerVisualState;
  selectedChargerIndex: number;
  onSelectChapter: (chapter: StoryChapterId) => void;
  onCycleChargerState: (nextState?: ChargerVisualState) => void;
  onFindChargerClick: () => void;
  onBecomeHostClick: () => void;
}

export const HeroScene: React.FC<HeroSceneProps> = ({
  activeChapter,
  chargerState,
  selectedChargerIndex,
  onSelectChapter,
  onCycleChargerState,
  onFindChargerClick,
  onBecomeHostClick,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [manualFallbackMode, setManualFallbackMode] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Store mutable refs so React state updates never recreate the WebGLRenderer
  const activeChapterRef = useRef<StoryChapterId>(activeChapter);
  const chargerStateRef = useRef<ChargerVisualState>(chargerState);
  const onCycleRef = useRef(onCycleChargerState);
  const chargerHandleRef = useRef<ReturnType<typeof createChargerModel> | null>(null);
  const neighbourhoodHandleRef = useRef<ReturnType<typeof createNeighbourhoodScene> | null>(null);
  const scrollCtrlRef = useRef<ScrollSceneController>(new ScrollSceneController());

  useEffect(() => {
    activeChapterRef.current = activeChapter;
    scrollCtrlRef.current.setChapter(activeChapter);
  }, [activeChapter]);

  useEffect(() => {
    chargerStateRef.current = chargerState;
    chargerHandleRef.current?.setChargerState(chargerState);
  }, [chargerState]);

  useEffect(() => {
    onCycleRef.current = onCycleChargerState;
  }, [onCycleChargerState]);

  useEffect(() => {
    neighbourhoodHandleRef.current?.highlightNodeIndex(selectedChargerIndex);
  }, [selectedChargerIndex]);

  // Keyboard shortcut 'H' to collapse/expand bottom 3D control dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);

    const lightsRig = setupSceneLighting(scene, renderer, isSoftwareGl);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const chargerModel = createChargerModel(maxAniso);
    chargerModel.setChargerState(chargerStateRef.current);
    scene.add(chargerModel.group);
    chargerHandleRef.current = chargerModel;

    const neighbourhood = createNeighbourhoodScene(maxAniso);
    scene.add(neighbourhood.rootGroup);
    neighbourhoodHandleRef.current = neighbourhood;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting setup restricted strictly to clickable 3D charger & vehicle meshes
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const interactables = [
      ...chargerModel.clickableMeshes,
      ...neighbourhood.clickableMeshes,
    ];

    let lastPointerMove = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastPointerMove < 32) return;
      lastPointerMove = now;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      scrollCtrlRef.current.setPointerNormalized(nx, ny);
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        onCycleRef.current();
      }
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglSupported(false);
    };

    const handleContextRestored = () => {
      setWebglSupported(true);
    };

    const handleResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Software WebGL safe animation loop using fenceSync afterDraw
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const delta = Math.min((nowMs - lastTimeMs) * 0.001, 0.1);
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) * 0.001;

      scrollCtrlRef.current.updateCamera(camera, delta, reducedMotion);
      chargerModel.updateAnimation(elapsed, delta);
      neighbourhood.updateAnimation(elapsed, scrollCtrlRef.current.currentNetworkWeight);

      lightsRig.chargerGlowLight.intensity =
        chargerStateRef.current === 'charging'
          ? 1.6 + Math.sin(elapsed * 3.5) * 0.35
          : 0.7;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      chargerModel.dispose();
      neighbourhood.dispose();
      lightsRig.dispose();
      renderer.dispose();
    };
  }, []);

  const showFallback = !webglSupported || manualFallbackMode;
  const currentKeyframe = CHAPTER_KEYFRAMES[activeChapter] || CHAPTER_KEYFRAMES.discover;

  return (
    <>
      {/* Fixed 3D WebGL Background Stage (Spans viewport behind scroll chapters) */}
      <div
        data-testid="three-stage-container"
        data-active-chapter={activeChapter}
        data-charger-state={chargerState}
        className="fixed inset-0 z-0 w-full h-screen bg-[#10281D] overflow-hidden"
      >
        {/* Dedicated empty ref container for Three.js WebGLRenderer */}
        <div
          ref={canvasMountRef}
          className={`w-full h-full ${showFallback ? 'hidden' : 'block'}`}
        />

        {/* Graceful Non-WebGL / Poster Fallback */}
        {showFallback && (
          <div
            data-testid="webgl-fallback-poster"
            className="w-full h-full flex items-center justify-center bg-[#10281D] p-4"
          >
            <div className="max-w-5xl w-full h-[78vh] border border-[#2E5E47] rounded overflow-hidden relative">
              <HeroDrivewayIllustration />
              <div className="absolute bottom-4 left-4 bg-[#173D2C] border border-[#D8F36A] px-3.5 py-2 rounded text-xs font-mono text-[#F6F3E9]">
                2D Architectural Fallback Active · Chapter {currentKeyframe.chapterNumber}:{' '}
                {currentKeyframe.label}
              </div>
            </div>
          </div>
        )}

        {/* Seamless Atmospheric Gradient Scrim so open typography is 100% legible without any box */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0A1B14] via-[#0A1B14]/85 via-48% to-transparent md:bg-gradient-to-r md:from-[#0A1B14] md:via-[#0A1B14]/92 md:via-42% md:to-transparent"
        />
      </div>

      {/* CHAPTER 1 — DISCOVER (Full-Screen Opening 3D Experience — No Enclosing Box) */}
      <section
        id="chapter-discover"
        aria-labelledby="hero-3d-heading"
        className="relative z-10 min-h-[calc(100vh-64px)] flex flex-col justify-start md:justify-center px-4 sm:px-8 pt-6 pb-28 md:py-14 pointer-events-none"
      >
        <div className="max-w-[1360px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left 5 Columns: Direct Editorial Typography on 3D Background (No Green Box) */}
          <div className="md:col-span-5 space-y-5 pointer-events-auto">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#D8F36A]">
              <span>CHAPTER 01 · DISCOVER</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#C8DDD2]">INDIAN P2P EV CHARGING NETWORK</span>
            </div>

            <h1
              id="hero-3d-heading"
              className="font-display font-bold text-white tracking-tight leading-[1.03]"
              style={{ fontSize: 'clamp(2.25rem, 4.1vw, 4rem)' }}
            >
              Your neighbourhood.
              <br />
              <span className="text-[#D8F36A]">Your next charge.</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-[#E6F0EB] leading-relaxed max-w-[42ch]">
              Discover private EV chargers nearby, book a slot, and turn idle charging time into
              something valuable.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="pt-1 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={onFindChargerClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase text-[#173D2C] bg-[#D8F36A] border border-[#D8F36A] rounded hover:bg-[#c9e854] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                FIND A CHARGER
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onBecomeHostClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase text-[#F6F3E9] bg-transparent border border-[#D8F36A] rounded hover:bg-[#173D2C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                BECOME A HOST
              </button>
            </div>

            {/* Interactive 3D Object State Prompt */}
            <div className="pt-3 border-t border-[#26503B]/80 flex flex-wrap items-center justify-between gap-3 text-xs text-[#C6D6CE] max-w-[42ch]">
              <span>
                3D Wallbox Status:{' '}
                <strong className="font-mono text-[#D8F36A] uppercase">
                  {chargerState === 'charging'
                    ? 'Active 7.4 kW Draw (₹14/kWh)'
                    : chargerState === 'reserved'
                    ? 'Reserved Slot (18:30 – 22:30)'
                    : 'Standby · Open for Booking'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => onCycleChargerState()}
                className="font-mono text-xs text-[#D8F36A] underline underline-offset-4 hover:text-white cursor-pointer whitespace-nowrap"
              >
                Toggle 3D Charger State
              </button>
            </div>
          </div>

          {/* Right 7 Columns: Unobstructed 3D Viewport Area so user sees both the 3D Charger & SUV */}
          <div className="md:col-span-7 hidden md:block" aria-hidden="true" />
        </div>
      </section>

      {/* Unified Collapsible Bottom 3D Control Dock (Solid surface, zero backdrop-blur) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(980px,95vw)] pointer-events-auto">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            aria-expanded={!dockCollapsed}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-mono uppercase tracking-wider bg-[#173D2C] text-[#D8F36A] border border-b-0 border-[#3A6E56] rounded-t cursor-pointer hover:bg-[#1E4D38]"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show 3D Story Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide 3D Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div
            role="region"
            aria-label="3D Scene and Story Chapter Controls"
            className="bg-[#143325] border border-[#3A6E56] rounded p-2.5 sm:p-3 text-[#F6F3E9] shadow-lg flex flex-col md:flex-row items-center justify-between gap-2.5"
          >
            {/* Chapter Camera Scrubber Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0">
              {ORDERED_CHAPTERS.map((chapId) => {
                const kf = CHAPTER_KEYFRAMES[chapId];
                const isCurrent = activeChapter === chapId;
                return (
                  <button
                    key={chapId}
                    type="button"
                    onClick={() => onSelectChapter(chapId)}
                    className={`px-2.5 py-1.5 text-[11px] font-mono rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#D8F36A] text-[#173D2C] font-bold'
                        : 'text-[#D0DFD7] hover:bg-[#1E4735] hover:text-white'
                    }`}
                  >
                    {kf.chapterNumber}. {kf.label}
                  </button>
                );
              })}
            </div>

            {/* 3D Charger State & Fallback Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onCycleChargerState()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-[#1E4735] hover:bg-[#275A44] text-[#D8F36A] border border-[#3E735A] rounded whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>State: {chargerState.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => setManualFallbackMode((prev) => !prev)}
                aria-pressed={manualFallbackMode}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono text-[#C6D6CE] hover:text-white border border-[#2F5C46] rounded whitespace-nowrap cursor-pointer"
              >
                <Eye className="w-3 h-3 text-[#D8F36A]" />
                <span>{manualFallbackMode ? '3D View' : '2D Poster'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
