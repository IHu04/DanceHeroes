declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import * as THREE from 'three';

    export class GLTFLoader extends THREE.Loader {
        constructor();
        load(
            url: string,
            onLoad: (gltf: GLTF) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
        parse(
            data: ArrayBuffer | string,
            path: string,
            onLoad: (gltf: GLTF) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
    }

    export interface GLTF {
        scene: THREE.Group;
        scenes: THREE.Group[];
        animations: THREE.AnimationClip[];
        cameras: THREE.Camera[];
        asset: object;
    }
}
