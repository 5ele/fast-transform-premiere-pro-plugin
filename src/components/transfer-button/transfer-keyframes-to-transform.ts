import {
	MATCH_NAME_MOTION,
	MATCH_NAME_OPACITY,
} from "../../types/effect-match-names";
import { getComponentKeyframesOrValuesFromSelectedClips } from "./get-component-keyframes";
import { getSelectedClipsFromTimeline } from "./get-selected-clips";

type Params = {
	includeOpacity: boolean;
};

export const transferKeyframesToTransform = async ({
	includeOpacity,
}: Params) => {
	const motionKeyframes =
		await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_MOTION);
	console.log(
		"🚀 ~ transferKeyframesToTransform ~ motionKeyframes:",
		motionKeyframes,
	);
	// const opacityKeyframes =
	// 	await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_OPACITY);

	createTransformWithKeyframesAndValues(motionKeyframes);
};

export const createTransformWithKeyframesAndValues = (keyframesAndValues) => {
	const selectedClips = getSelectedClipsFromTimeline();
};
