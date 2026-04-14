const BONE_BLOCKS_PER_UNIT = 4;
const BONES_PER_BONE_BLOCK = 3;
const BLAZE_RODS_PER_UNIT = 3;

export function calculateOptimalPurchaseSplit({ budget, bonePrice, boneBlockPrice, blazeRodPrice }) {
  const hasBonePrice = Number.isFinite(bonePrice);
  const hasBoneBlockPrice = Number.isFinite(boneBlockPrice);

  if (hasBonePrice === hasBoneBlockPrice) {
    return {
      error: "Provide exactly one of Bone price or Bone Block price.",
    };
  }

  const usingBones = hasBonePrice;
  const resolvedBonePrice = hasBonePrice ? bonePrice : boneBlockPrice / BONES_PER_BONE_BLOCK;
  const resolvedBoneBlockPrice = hasBonePrice ? bonePrice * BONES_PER_BONE_BLOCK : boneBlockPrice;
  const costPerUnit = (BONE_BLOCKS_PER_UNIT * resolvedBoneBlockPrice) + (BLAZE_RODS_PER_UNIT * blazeRodPrice);

  if (costPerUnit <= 0 || budget < costPerUnit) {
    return {
      error: "Budget too small for a full set (4 Bone Blocks + 3 Blaze Rods).",
    };
  }

  const units = Math.floor(budget / costPerUnit);
  const totalCost = units * costPerUnit;
  const leftover = budget - totalCost;
  const boneBlocks = units * BONE_BLOCKS_PER_UNIT;
  const bones = boneBlocks * BONES_PER_BONE_BLOCK;
  const blazeRods = units * BLAZE_RODS_PER_UNIT;

  return {
    usingBones,
    units,
    costPerUnit,
    totalCost,
    leftover,
    bonePrice: resolvedBonePrice,
    boneBlockPrice: resolvedBoneBlockPrice,
    boneBlocks,
    bones,
    blazeRods,
  };
}

export const ratioRecipe = {
  boneBlocksPerUnit: BONE_BLOCKS_PER_UNIT,
  bonesPerBoneBlock: BONES_PER_BONE_BLOCK,
  blazeRodsPerUnit: BLAZE_RODS_PER_UNIT,
};