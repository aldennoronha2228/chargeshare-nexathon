import * as THREE from 'three';

export type StoryChapterId =
  | 'discover'
  | 'connect'
  | 'find'
  | 'book'
  | 'share'
  | 'safety'
  | 'conversion';

export interface CameraKeyframe {
  id: StoryChapterId;
  label: string;
  chapterNumber: string;
  position: [number, number, number];
  target: [number, number, number];
  networkWeight: number;
}

export const CHAPTER_KEYFRAMES: Record<StoryChapterId, CameraKeyframe> = {
  discover: {
    id: 'discover',
    chapterNumber: '01',
    label: 'Discover',
    position: [-0.38, 1.48, 6.65],
    target: [-0.12, 0.96, -0.35],
    networkWeight: 0.2,
  },
  connect: {
    id: 'connect',
    chapterNumber: '02',
    label: 'Connect',
    position: [-4.2, 11.8, 15.2],
    target: [-3.4, 0.6, 0.5],
    networkWeight: 1.0,
  },
  find: {
    id: 'find',
    chapterNumber: '02',
    label: 'Connect',
    position: [-4.2, 11.8, 15.2],
    target: [-3.4, 0.6, 0.5],
    networkWeight: 0.85,
  },
  book: {
    id: 'book',
    chapterNumber: '03',
    label: 'Book & Charge',
    position: [0.65, 1.45, 3.25],
    target: [0.85, 1.15, 0.15],
    networkWeight: 0.25,
  },
  share: {
    id: 'share',
    chapterNumber: '04',
    label: 'Safety',
    position: [-1.15, 2.35, 5.4],
    target: [-0.35, 1.12, -0.4],
    networkWeight: 0.45,
  },
  safety: {
    id: 'safety',
    chapterNumber: '04',
    label: 'Trust & Safety',
    position: [0.95, 1.55, 3.1],
    target: [1.05, 1.24, 0.1],
    networkWeight: 0.2,
  },
  conversion: {
    id: 'conversion',
    chapterNumber: '05',
    label: 'Get Started',
    position: [1.45, 2.85, 6.8],
    target: [-0.45, 1.05, -0.35],
    networkWeight: 0.75,
  },
};

export const ORDERED_CHAPTERS: StoryChapterId[] = [
  'discover',
  'connect',
  'book',
  'safety',
  'conversion',
];

// Pre-allocated module-scope vectors to guarantee zero GC allocations in the render loop
const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

export class ScrollSceneController {
  private currentPos = new THREE.Vector3(-0.38, 1.48, 6.65);
  private currentTarget = new THREE.Vector3(-0.12, 0.96, -0.35);
  private activeChapter: StoryChapterId = 'discover';
  private pointerX = 0;
  private pointerY = 0;
  private elapsedTime = 0;
  public currentNetworkWeight = 0.2;

  public setChapter(chapter: StoryChapterId) {
    this.activeChapter = chapter;
  }

  public getChapter(): StoryChapterId {
    return this.activeChapter;
  }

  public setPointerNormalized(nx: number, ny: number) {
    this.pointerX = THREE.MathUtils.clamp(nx, -1, 1);
    this.pointerY = THREE.MathUtils.clamp(ny, -1, 1);
  }

  public updateCamera(
    camera: THREE.PerspectiveCamera,
    delta: number,
    reducedMotion: boolean
  ) {
    this.elapsedTime += delta;
    const kf = CHAPTER_KEYFRAMES[this.activeChapter] || CHAPTER_KEYFRAMES.discover;
    const parallaxScale = reducedMotion ? 0 : 0.16;
    const idleDriftX = reducedMotion ? 0 : Math.sin(this.elapsedTime * 0.42) * 0.04;
    const idleDriftY = reducedMotion ? 0 : Math.cos(this.elapsedTime * 0.31) * 0.018;
    const aspect = camera.aspect || 1.5;

    let aspectPosOffsetX = 0;
    let aspectPosOffsetZ = 0;
    let aspectTargetOffsetX = 0;
    let aspectTargetOffsetY = 0;

    if (aspect < 0.85) {
      // Portrait mobile (smartphones):
      if (this.activeChapter === 'book') {
        aspectPosOffsetX = 0.35;
        aspectPosOffsetZ = 2.1;
        aspectTargetOffsetX = 0.25;
        aspectTargetOffsetY = 0.92;
      } else if (this.activeChapter === 'connect') {
        aspectPosOffsetX = 0.8;
        aspectPosOffsetZ = 3.8;
        aspectTargetOffsetX = 0.5;
        aspectTargetOffsetY = 0.85;
      } else {
        // Discover / Hero & other chapters: frame car and charger cleanly in lower screen below hero CTA buttons
        aspectPosOffsetX = 0.85;
        aspectPosOffsetZ = 1.65;
        aspectTargetOffsetX = 0.78;
        aspectTargetOffsetY = 1.05;
      }
    } else if (aspect < 1.25) {
      // Split-screen / tablet preview pane (768px - 1050px wide)
      aspectPosOffsetX = -0.22;
      aspectPosOffsetZ = 0.65;
      aspectTargetOffsetX = -0.28;
    }

    _desiredPos.set(
      kf.position[0] + aspectPosOffsetX + this.pointerX * parallaxScale + idleDriftX,
      kf.position[1] - this.pointerY * parallaxScale * 0.5 + idleDriftY,
      kf.position[2] + aspectPosOffsetZ
    );

    _desiredTarget.set(
      kf.target[0] + aspectTargetOffsetX + this.pointerX * parallaxScale * 0.3,
      kf.target[1] + aspectTargetOffsetY - this.pointerY * parallaxScale * 0.2,
      kf.target[2]
    );

    if (reducedMotion) {
      this.currentPos.copy(_desiredPos);
      this.currentTarget.copy(_desiredTarget);
      this.currentNetworkWeight = kf.networkWeight;
    } else {
      const lambda = 4.2;
      this.currentPos.x = THREE.MathUtils.damp(this.currentPos.x, _desiredPos.x, lambda, delta);
      this.currentPos.y = THREE.MathUtils.damp(this.currentPos.y, _desiredPos.y, lambda, delta);
      this.currentPos.z = THREE.MathUtils.damp(this.currentPos.z, _desiredPos.z, lambda, delta);

      this.currentTarget.x = THREE.MathUtils.damp(
        this.currentTarget.x,
        _desiredTarget.x,
        lambda,
        delta
      );
      this.currentTarget.y = THREE.MathUtils.damp(
        this.currentTarget.y,
        _desiredTarget.y,
        lambda,
        delta
      );
      this.currentTarget.z = THREE.MathUtils.damp(
        this.currentTarget.z,
        _desiredTarget.z,
        lambda,
        delta
      );

      this.currentNetworkWeight = THREE.MathUtils.damp(
        this.currentNetworkWeight,
        kf.networkWeight,
        lambda,
        delta
      );
    }

    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);
  }
}
