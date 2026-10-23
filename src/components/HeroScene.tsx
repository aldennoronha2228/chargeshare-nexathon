import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowRight } from 'lucide-react';
import { detectSoftwareGl, setupSceneLighting } from '../three/SceneLighting';
import { createChargerModel, type ChargerVisualState } from '../three/ChargerModel';
import { createNeighbourhoodScene } from '../three/NeighbourhoodScene';
import {
  ScrollSceneController,
  CHAPTER_KEYFRAMES,
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
  onCycleChargerState,
  onFindChargerClick,
  onBecomeHostClick,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [vehicleLoaded, setVehicleLoaded] = useState<boolean>(false);
  const [manualFallbackMode] = useState<boolean>(false);

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

    const computeFov = (aspect: number) => {
      if (aspect < 1.0) {
        // Portrait mobile: widen vertical FOV proportionally to preserve horizontal framing of car & charger
        const baseFovRad = (36 * Math.PI) / 180;
        const targetHalfAngle = Math.tan(baseFovRad / 2) * (1.16 / aspect);
        const dynamicFov = (2 * Math.atan(targetHalfAngle) * 180) / Math.PI;
        return Math.min(Math.max(dynamicFov, 36), 55);
      }
      // 36 deg vertical FOV (~48mm full-frame automotive commercial lens)
      return 36;
    };

    const isMobileDevice = window.innerWidth < 768;
    const maxDpr = isMobileDevice ? 1.6 : 2;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'pan-y';

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const initialAspect = width / height;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(computeFov(initialAspect), initialAspect, 0.1, 120);

    const lightsRig = setupSceneLighting(scene, renderer, isSoftwareGl);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const chargerModel = createChargerModel(maxAniso);
    chargerModel.setChargerState(chargerStateRef.current);
    scene.add(chargerModel.group);
    chargerHandleRef.current = chargerModel;

    const neighbourhood = createNeighbourhoodScene(maxAniso, () => {
      setVehicleLoaded(true);
    });
    scene.add(neighbourhood.rootGroup);
    neighbourhoodHandleRef.current = neighbourhood;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting setup restricted strictly to clickable 3D charger & vehicle meshes
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

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
      const interactables = [
        ...chargerModel.clickableMeshes,
        ...neighbourhood.clickableMeshes,
      ];
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
      const w = window.innerWidth || mountEl.clientWidth;
      const h = window.innerHeight || mountEl.clientHeight;
      const aspect = w / h;
      camera.fov = computeFov(aspect);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      scrollCtrlRef.current.updateCamera(camera, 0.016, reducedMotion);
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(mountEl);

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
          ? 0.28 + Math.sin(elapsed * 2.4) * 0.06
          : 0.12;

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
      resizeObserver.disconnect();
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
        data-vehicle-loaded={vehicleLoaded ? 'true' : 'false'}
        className="fixed inset-0 z-0 w-full h-screen bg-[#0D1D16] overflow-hidden"
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
            className="w-full h-full flex items-center justify-center bg-[#0D1D16] p-4"
          >
            <div className="max-w-5xl w-full h-[78vh] border border-[#2E5E47] rounded overflow-hidden relative">
              <HeroDrivewayIllustration />
              <div className="absolute bottom-4 left-4 bg-[#173D2C] border border-[#D8F36A] px-3.5 py-2 rounded text-xs font-mono text-[#F6F3E9]">
                2D Architectural Fallback Active · {currentKeyframe.label}
              </div>
            </div>
          </div>
        )}

        {/* Restrained Atmospheric Gradient Scrim: protects left text legibility while leaving the right 3D vehicle & architecture 100% clear */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#08130E]/92 via-[#08130E]/68 via-52% to-transparent md:bg-gradient-to-r md:from-[#08130E]/92 md:via-[#08130E]/65 md:via-36% md:to-transparent"
        />
      </div>

      {/* Opening 3D Experience — Flush-Left Condensed Uppercase Display Typography & Alignment */}
      <section
        id="chapter-discover"
        aria-labelledby="hero-3d-heading"
        className="relative z-10 min-h-screen flex flex-col justify-start md:justify-center px-5 sm:px-10 lg:px-16 pt-28 sm:pt-32 pb-12 md:pt-28 md:pb-16 pointer-events-none"
      >
        <div className="max-w-[1360px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left 7 Columns: Condensed Uppercase Display Headline + Clean Flush-Left Alignment */}
          <div className="md:col-span-7 flex flex-col items-start text-left space-y-5 sm:space-y-6 pointer-events-auto">
            <h1
              id="hero-3d-heading"
              className="font-hero-display font-normal text-white uppercase leading-[0.95] tracking-[0.015em] text-left"
              style={{ fontSize: 'clamp(2.15rem, 4.5vw, 4.25rem)' }}
            >
              <span className="block whitespace-nowrap">YOUR NEIGHBOURHOOD.</span>
              <span className="block whitespace-nowrap text-[#D8F36A]">YOUR NEXT CHARGE.</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-[17px] text-[#E6F0EB] leading-[1.55] max-w-[44ch] font-normal text-left">
              Discover private EV chargers nearby, book a slot, and turn idle charging time into
              something valuable.
            </p>

            {/* Primary & Secondary CTAs — Side by Side Flush-Left on Both Mobile & PC */}
            <div className="pt-1 flex flex-row items-center justify-start gap-3 sm:gap-4 w-full max-w-[430px]">
              <button
                type="button"
                onClick={onFindChargerClick}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-7 py-3 sm:py-3.5 text-[11px] sm:text-xs font-bold tracking-[0.08em] uppercase text-[#173D2C] bg-[#D8F36A] border border-[#D8F36A] rounded-[4px] hover:bg-[#c9e854] active:bg-[#b8d646] transition-colors whitespace-nowrap cursor-pointer min-h-[46px] sm:min-h-[48px]"
              >
                <span>FIND A CHARGER</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onBecomeHostClick}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-7 py-3 sm:py-3.5 text-[11px] sm:text-xs font-bold tracking-[0.08em] uppercase text-[#F6F3E9] bg-[#0D1D16]/45 backdrop-blur-xs border border-[#D8F36A]/80 rounded-[4px] hover:bg-[#173D2C] active:bg-[#112E21] transition-colors whitespace-nowrap cursor-pointer min-h-[46px] sm:min-h-[48px]"
              >
                <span>BECOME A HOST</span>
              </button>
            </div>
          </div>

          {/* Right 5 Columns: Unobstructed 3D Viewport Area so user sees both the 3D Charger & Electric Fastback */}
          <div className="md:col-span-5 hidden md:block" aria-hidden="true" />
        </div>
      </section>
    </>
  );
};
