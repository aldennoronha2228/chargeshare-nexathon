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
    position: [-1.35, 2.25, 6.8],
    target: [-1.25, 1.25, -0.6],
    networkWeight: 0.35,
  },
  connect: {
    id: 'connect',
    chapterNumber: '02',
    label: 'Connect',
    position: [-4.6, 13.5, 16.8],
    target: [-4.0, 0.5, 0.8],
    networkWeight: 1.0,
  },
  find: {
    id: 'find',
    chapterNumber: '02',
    label: 'Connect',
    position: [-4.6, 13.5, 16.8],
    target: [-4.0, 0.5, 0.8],
    networkWeight: 0.85,
  },
  book: {
    id: 'book',
    chapterNumber: '03',
    label: 'Book & Charge',
    position: [0.65, 1.85, 3.45],
    target: [0.55, 1.48, -0.65],
    networkWeight: 0.4,
  },
  share: {
    id: 'share',
    chapterNumber: '04',
    label: 'Safety',
    position: [-1.5, 3.4, 5.8],
    target: [-0.8, 1.4, -0.8],
    networkWeight: 0.95,
  },
  safety: {
    id: 'safety',
    chapterNumber: '04',
    label: 'Trust & Safety',
    position: [1.2, 2.1, 3.2],
    target: [0.85, 1.65, -0.86],
    networkWeight: 0.3,
  },
  conversion: {
    id: 'conversion',
    chapterNumber: '05',
    label: 'Get Started',
    position: [1.8, 4.4, 8.4],
    target: [-0.8, 1.2, -0.4],
    networkWeight: 0.9,
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
  private currentPos = new THREE.Vector3(-1.35, 2.25, 6.8);
  private currentTarget = new THREE.Vector3(-1.25, 1.25, -0.6);
  private activeChapter: StoryChapterId = 'discover';
  private pointerX = 0;
  private pointerY = 0;
  public currentNetworkWeight = 0.35;

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
    const kf = CHAPTER_KEYFRAMES[this.activeChapter] || CHAPTER_KEYFRAMES.discover;
    const parallaxScale = reducedMotion ? 0 : 0.22;
    const aspect = camera.aspect || 1.5;

    // Responsive framing so the 3D objects never collide with the typography:
    // - On landscape / split-screen (aspect >= 0.82), shift camera target left so 3D scene projects into the right 56% of viewport.
    // - On narrow portrait mobile (aspect < 0.82), pull camera back and shift target upward so 3D scene sits in the bottom half below the text.
    let aspectPosOffsetX = 0;
    let aspectPosOffsetZ = 0;
    let aspectTargetOffsetX = 0;
    let aspectTargetOffsetY = 0;

    if (aspect < 0.82) {
      // Portrait mobile: center horizontally, push 3D objects into lower half of screen
      aspectPosOffsetX = 1.9;
      aspectPosOffsetZ = 2.6;
      aspectTargetOffsetX = 1.95;
      aspectTargetOffsetY = 1.35;
    } else if (aspect < 1.25) {
      // Split-screen preview pane (768px - 1050px wide): push 3D objects slightly further right
      aspectPosOffsetX = -0.35;
      aspectPosOffsetZ = 0.9;
      aspectTargetOffsetX = -0.45;
    }

    _desiredPos.set(
      kf.position[0] + aspectPosOffsetX + this.pointerX * parallaxScale,
      kf.position[1] - this.pointerY * parallaxScale * 0.6,
      kf.position[2] + aspectPosOffsetZ
    );

    _desiredTarget.set(
      kf.target[0] + aspectTargetOffsetX + this.pointerX * parallaxScale * 0.35,
      kf.target[1] + aspectTargetOffsetY - this.pointerY * parallaxScale * 0.25,
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
