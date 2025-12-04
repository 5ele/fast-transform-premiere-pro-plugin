import {
	MATCH_NAME_MOTION,
	MATCH_NAME_OPACITY,
} from "../../types/effect-match-names";
import {
	ComponentKeyframesAndValues,
	getComponentKeyframesOrValuesFromSelectedClips,
} from "./get-component-keyframes";
import { getSelectedClipsFromTimeline } from "./get-selected-clips";

type TransferKeyframesParams = {
	includeOpacity: boolean;
};

export const transferKeyframesToTransform = async ({
	includeOpacity,
}: TransferKeyframesParams) => {
	// const motionKeyframesAndValues =
	const selectedClips = await getSelectedClipsFromTimeline();
	if (selectedClips.length === 0) {
		throw new Error("No clips selected on the timeline");
	}

	// TODO: replace this "selectedClips[0]" with
	// logic for finding the clip you want to actually affect
	const clip = selectedClips[0];
	return await getComponentKeyframesOrValuesFromSelectedClips({
		componentMatchName: MATCH_NAME_MOTION,
		clip,
	});

	if (motionKeyframesAndValues === undefined) {
		console.error("failed to get motion keyframes");
		return;
	}

	if (!includeOpacity) {
		createTransformWithKeyframesAndValues({ motionKeyframesAndValues });
	} else {
		const opacityKeyframesAndValues =
			await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_OPACITY);
		if (opacityKeyframesAndValues === undefined) {
			createTransformWithKeyframesAndValues({ motionKeyframesAndValues });
		} else {
			createTransformWithKeyframesAndValues({
				motionKeyframesAndValues,
				opacityKeyframesAndValues,
			});
		}
	}
};

type CreateTransformParams = {
	motionKeyframesAndValues: ComponentKeyframesAndValues;
	opacityKeyframesAndValues?: ComponentKeyframesAndValues;
};
export const createTransformWithKeyframesAndValues = ({
	motionKeyframesAndValues,
	opacityKeyframesAndValues,
}: CreateTransformParams) => {};
