import { Vector3 } from 'three';
const bones = ['hips', 'spine', 'chest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
export function getBonePositions(vrm) {
  const positions = {};
  for (const bone of bones) {
    const node = vrm.humanoid.getRawBoneNode(bone);
    if (node) {
      const point = node.getWorldPosition(new Vector3());
      positions[bone] = { x: point.x, y: point.y, z: point.z };
    }
  }
  return positions;
}
