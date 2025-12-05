import { premierepro } from "../../globals";
import {
	MATCH_NAME_MOTION,
	MATCH_NAME_OPACITY,
	MATCH_NAME_TRANSFORM,
} from "../../types/effect-match-names";
import {
	Action,
	AudioClipTrackItem,
	Component,
	ComponentParam,
	Keyframe,
	PointF,
	Project,
	VideoClipTrackItem,
	VideoComponentChain,
	VideoFilterComponent,
} from "../../types/ppro";
import {
	ComponentKeyframesAndValues,
	getClipComponentByMatchName,
	getComponentKeyframesOrValuesFromClip,
	KeyframesOrValue,
	ParamValue,
} from "./get-component-keyframes-from-clip";
import { getActiveProject, getSelectedClipsFromTimeline } from "./get-project-entities";
import { Clip } from "./types";
import { isVideoClipTrackItem } from "./util";

// TODO: flow:
// 	button.tsx: pass in options
//		-> main: process every selected clip requested
//			-> createTransform: create a transform on one clip
//				-> helpers...
// TODO: rename functions they are bad

// TODO: NOTE: 	I don't want it to fail everything if there's an audio clip selected
// TODO: NOTE: 	I want to re-use the transform effect if there's already one.
// 							- option?
// 								- i.e. when I use multiple transforms on a single clip: framing, face-tracking, etc.
// 							- options: 'create new or re-use', 'if more than one, re-use first', 'always create new'

// export type MotionParams = {
//  0	position: PointF;
//  1	scale: number;
//  2	scaleWidth: number;
//  3	uniformScale: boolean;
//  4	rotation: number;
//  5	anchorPoint: PointF;
//  6	antiFlickerFilter: number;
//  7	cropLeft: number;
//  8	cropTop: number;
//  9	cropRight: number;
//  10	cropBottom: number;

// TRANSFORM PARAMS
// 0   Anchor Point				:
// 1   Position						:
// 2   										: Uniform Scale
// 3   Scale							: Scale / Scale Height
// 4    									: Scale Width
// 5   Skew								:
// 6   Skew Axis					:
// 7   Rotation						:
// 8   Opacity						:
// 9   " "								: Use Composition's Shutter Angle (should always be off)
// 10   Shutter Angle			:
// 11   Sampling					:

export type SelectedClipsToTransfer = "all" | "closestToPlayhead";
type Options = {
	includeOpacity?: boolean;
	includeBlendingMode?: boolean;
	shutterSpeed: 180;
	// keepShutterSpeed: false; // if you're changing an existing transform effect
};

type ClipPromiseReturns = [
	VideoComponentChain,
	ComponentKeyframesAndValues | undefined,
	VideoFilterComponent,
];

// MAIN
export const motionKeyframesToTransformEffect = async (
	clipsToTransfer: SelectedClipsToTransfer,
	options?: Options,
) => {
	const allSelectedClips = await getSelectedClipsFromTimeline();
	if (allSelectedClips.length === 0) throw new Error("No clips selected on the timeline");

	if (clipsToTransfer === "all") {
		createTransformFromMotion(allSelectedClips, options);
	} else if (clipsToTransfer === "closestToPlayhead") {
		// TODO: replace this "allSelectedClips[0]" with
		// logic for finding the clip you want to actually affect
		createTransformFromMotion([allSelectedClips[0]], options);
	}
};

const createTransformFromMotion = async (clips: Clip[], options?: Options) => {
	// TODO: handle options

	// const actions: Action[] = [];

	const handleClipPromises: Promise<ClipPromiseReturns>[] = [];
	for (const clip of clips) {
		if (!isVideoClipTrackItem(clip)) throw new Error("ERROR: Not a video clip");

		// get motion keyframes
		const motionKeyframesPromise = getComponentKeyframesOrValuesFromClip({
			componentMatchName: MATCH_NAME_MOTION,
			clip,
		});

		// get clip components
		const componentsPromise = clip.getComponentChain();

		// create a transform effect object
		const transformComponentPromise =
			premierepro.VideoFilterFactory.createComponent(MATCH_NAME_TRANSFORM);

		const concurrentFunctions = Promise.all([
			componentsPromise,
			motionKeyframesPromise,
			transformComponentPromise,
		]);

		handleClipPromises.push(concurrentFunctions);
	}

	const clipsWithActionsAndInfo: {
		components: VideoComponentChain;
		motionKeyframesAndValues: ComponentKeyframesAndValues;
		// transformComponent: VideoFilterComponent;
		addTransformAction: Action;
	}[] = [];

	const results = await Promise.allSettled(handleClipPromises);
	results.forEach((result) => {
		try {
			if (result.status === "rejected") throw new Error("result rejected");

			const components = result.value[0];
			const motionKeyframesAndValues = result.value[1];
			const transformComponent = result.value[2];
			if (motionKeyframesAndValues === undefined)
				throw new Error("ERROR: Failed getting keyframes");

			const addTransformAction = components.createAppendComponentAction(transformComponent);

			clipsWithActionsAndInfo.push({
				components,
				motionKeyframesAndValues,
				// transformComponent
				addTransformAction,
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : JSON.stringify(e);
			console.error(msg);
			return; // some sort of error state
		}
	});

	const project = await getActiveProject();
	let success = true;
	let countExecutionLoops = 0;

	// EXECUTE ACTIONS: UN-DOABLE ----------------------------------------------------------------------------
	project.lockedAccess(() => {
		success = project.executeTransaction((compoundAction) => {
			for (const clip of clipsWithActionsAndInfo) {
				compoundAction.addAction(clip.addTransformAction);
				countExecutionLoops++;
			}
		}, "Fast Transform: Add transform effects to clips");

		if (!success || countExecutionLoops !== clipsWithActionsAndInfo.length)
			throw new Error("ERR: Failed to create transform effect(s)");
	});

	// for (const clip of clipsWithActionsAndInfo) {
	// 	const components = clip.components;
	// 	const componentCount = components.getComponentCount();

	// 	// assuming transform is last component
	// 	const transformComponent = components.getComponentAtIndex(componentCount - 1);
	// 	const paramsCount = transformComponent.getParamCount();
	// 	const motionKeyframesAndValues = clip.motionKeyframesAndValues;
	// 	const motionParamIndexedKeys = Object.keys(motionKeyframesAndValues);

	// 	for (let paramIndex = 0; paramIndex < paramsCount; paramIndex++) {
	// 		const param = transformComponent.getParam(paramIndex);

	// 		const isKeyframable = await param.areKeyframesSupported();
	// 		// if (!isKeyframable) break;

	// 		// const action = param.createSetTimeVaryingAction(true);
	// 		// project.lockedAccess(() => {
	// 		// 	project.executeTransaction((compoundAction) => {
	// 		// 		compoundAction.addAction(action);
	// 		// 	}, "set time varying");
	// 		// });
	// 	}
	// }

	// this is all synchronous --- but don't think I can combine this into less than 2 un-doable executions
	const transferParamsActions: Action[] = [];
	for (const clip of clipsWithActionsAndInfo) {
		const components = clip.components;
		const componentCount = components.getComponentCount();

		// assuming transform is last component
		const transformComponent = components.getComponentAtIndex(componentCount - 1);
		const paramsCount = transformComponent.getParamCount();
		const motionKeyframesAndValues = clip.motionKeyframesAndValues;
		const motionParamIndexedKeys = Object.keys(motionKeyframesAndValues);

		for (let paramIndex = 0; paramIndex < paramsCount; paramIndex++) {
			try {
				//TODO: MOVE HERE
				const transformParam = transformComponent.getParam(paramIndex);
				let correspondingMotionParamIndex: number = -1;
				// transform: anchor point
				if (paramIndex === 0) correspondingMotionParamIndex = 5;
				// transform: position
				else if (paramIndex === 1) {
					correspondingMotionParamIndex = 0;
				}
				// transform: uniform scale
				else if (paramIndex === 2) {
					correspondingMotionParamIndex = 3;
				}
				// transform: scale (scale height when uniform scale is checked)
				else if (paramIndex === 3) correspondingMotionParamIndex = 1;
				// transform: (scale width when uniform scale is checked)
				else if (paramIndex === 4) correspondingMotionParamIndex = 2;
				// transform: skew
				else if (paramIndex === 5) correspondingMotionParamIndex = -1;
				// transform: skew axis
				else if (paramIndex === 6) correspondingMotionParamIndex = -1;
				// transform: rotation
				else if (paramIndex === 7) {
					correspondingMotionParamIndex = 4;
				}
				// transform: opacity
				else if (paramIndex === 8)
					correspondingMotionParamIndex = -1; // this is where I'd put opacity tho
				// HARDCODED (constant values that aren't in Motion)
				// transform: use composition's shutter angle (should always be off)
				else if (paramIndex === 9) {
					correspondingMotionParamIndex = -1;
					const actions: Action[] = updateTransformParam(
						{ hasKeyframes: false, keyframesOrValue: false },
						transformParam,
					);
					actions && transferParamsActions.push(...actions);
				}
				// transform: shutter angle
				else if (paramIndex === 10) {
					correspondingMotionParamIndex = -1;
					const actions: Action[] = updateTransformParam(
						{ hasKeyframes: false, keyframesOrValue: 180 },
						transformParam,
					);
					actions && transferParamsActions.push(...actions);
				}
				// transform: sampling: bilinear or bicubic, 0 or 1
				else if (paramIndex === 11) {
					correspondingMotionParamIndex = -1;
					const actions: Action[] = updateTransformParam(
						{ hasKeyframes: false, keyframesOrValue: 0 },
						transformParam,
					);
					actions && transferParamsActions.push(...actions);
				}

				if (correspondingMotionParamIndex >= 0) {
					const correspondingMotionParam: KeyframesOrValue =
						motionKeyframesAndValues[motionParamIndexedKeys[correspondingMotionParamIndex]];
					const actions: Action[] = updateTransformParam(correspondingMotionParam, transformParam);

					if (actions && actions.length > 0) transferParamsActions.push(...actions);
				}
			} catch (e) {
				console.error(e);
			}
		}
	}

	// countExecutionLoops = 0;
	project.lockedAccess(() => {
		success = project.executeTransaction((compoundAction) => {
			for (const action of transferParamsActions) {
				compoundAction.addAction(action);
				// countExecutionLoops++;
			}
		}, "Send: Motion -> Transform");

		if (!success) {
			// || countExecutionLoops !== transferParamsActions.length) {
			// console.log("🚀 ~ createTransformFromMotion ~ countExecutionLoops:", countExecutionLoops);
			// console.log("🚀 ~ createTransformFromMotion ~ success:", success);
			// console.log(
			// 	"🚀 ~ createTransformFromMotion ~ transferParamsActions.length:",
			// 	transferParamsActions.length,
			// );
			// console.error("hi");
			throw new Error("ERR: Failed to transfer keyframes/values");
		}
	});

	// DISABLE MOTION EFFECT
	// TODO: combine this into the 2nd un-doable execution
	// this didn't work, either way I can just reset all params individually it's really the same thing.
	// separate execution -> can just hit ctrl+z to get the motion settings back (but only works if it's my next move)
	// could also store motion settings and have a restore button. Like restore motion keyframes

	// for (const clip of clips) {
	// 	const motionComponent = await getClipComponentByMatchName(clip, MATCH_NAME_MOTION);
	// 	const componentChain = await clip.getComponentChain();
	// 	const numComponents = componentChain.getComponentCount();
	// 	for (let i = 0; i < numComponents; i++) {
	// 		const component = componentChain.getComponentAtIndex(i);
	// 		const name = await component.getMatchName();
	// 		console.log("🚀 ~ createTransformFromMotion ~ name:", i, name);
	// 	}

	// 	if (motionComponent) {
	// 		const removeComponentAction = componentChain.createRemoveComponentAction(motionComponent);

	// 		project.lockedAccess(() => {
	// 			success = project.executeTransaction((compoundAction) => {
	// 				compoundAction.addAction(removeComponentAction);
	// 				// compoundAction.addAction(addNewMotionComponent);
	// 			}, "Send: Motion -> Transform");
	// 		});
	// 	}
	// }
};

// If param doesn't have keyframes this doesn't do anything
const cleanParamKeyframesOrValue = (param: ComponentParam) => {
	const keyframeTimes = param.getKeyframeListAsTickTimes();
	if (keyframeTimes.length === 0) return;

	return param.createRemoveKeyframeRangeAction(keyframeTimes[0], keyframeTimes.at(-1)!);
};

const updateTransformParam = (
	correspondingMotionParam: KeyframesOrValue,
	transformParam: ComponentParam,
) => {
	const actions: Action[] = [];

	// CLEAN TRANSFORM PARAM (completely override it with motion param)
	const clearTransformParamActions: Action | undefined = cleanParamKeyframesOrValue(transformParam);
	if (clearTransformParamActions) actions.push(clearTransformParamActions); // action

	// ------------------------------------------------------------------------------
	// MOTION PARAM: KEYFRAMES => TRANSFORM PARAM
	//
	if (correspondingMotionParam.hasKeyframes) {
		const motionKeyframes = correspondingMotionParam.keyframesOrValue as Keyframe[];
		const setTimeVaryingAction = transformParam.createSetTimeVaryingAction(true);
		actions.push(setTimeVaryingAction);
		for (const motionKeyframe of motionKeyframes) {
			const addKeyframeAction = transformParam.createAddKeyframeAction(motionKeyframe);

			actions.push(addKeyframeAction);
		}
	}
	//
	// MOTION PARAM: KEYFRAMES => TRANSFORM PARAM
	// ------------------------------------------------------------------------------

	// MOTION PARAM: SINGLE VALUE => TRANSFORM PARAM
	else if (!correspondingMotionParam.hasKeyframes) {
		const motionValue = correspondingMotionParam.keyframesOrValue as ParamValue;
		let keyframeFromMotion: Keyframe;
		if (
			typeof motionValue === "string" ||
			typeof motionValue === "number" ||
			typeof motionValue === "boolean"
		) {
			keyframeFromMotion = transformParam.createKeyframe(motionValue);
		} else {
			// type PointF | Color
			if (typeof motionValue === "object") {
				// type PointF
				if (typeof motionValue[0] === "number") {
					// PointF exists just isn't in the typescript file.
					const pointF = premierepro.PointF(motionValue[0], motionValue[1]);
					keyframeFromMotion = transformParam.createKeyframe(pointF);
				}
			}
			// type Color
			else {
				console.error('Motion param of type "Color" not handled');
				// console.log("🚀 ~ updateTransformParam ~ motionValue:", motionValue);
			}
		}

		const setValueAction = transformParam.createSetValueAction(keyframeFromMotion!);
		actions.push(setValueAction); // action
	}

	return actions;
};

// const test = async (action: Action) => {
// 	const project = await getActiveProject();

// 	project.lockedAccess(() => {
// 		project.executeTransaction((compoundAction) => {
// 			compoundAction.addAction(action);
// 		}, "varying step");
// 	});
// };
