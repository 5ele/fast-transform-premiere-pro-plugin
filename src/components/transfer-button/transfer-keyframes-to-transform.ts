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
		// // add new transform effect to clip
		// const addTransformAction = async () => {
		// 	// const [components, transformComponent] = await Promise.all([
		// 		// get clip components
		// 		clip.getComponentChain(),

		// 		// create a transform effect object
		// 		premierepro.VideoFilterFactory.createComponent(MATCH_NAME_TRANSFORM),
		// 	]);
		// 	// const addTransformAction =
		// 	// 	 components.createAppendComponentAction(transformComponent);

		// 	return { addTransformAction, components, transformComponent };
		// };
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
	project.lockedAccess(() => {
		// I think execution loops timeout after a bit, so this is making sure it added a transform effect to every clip
		// if the count is lower than the number of clips it should fail before getting to the next execution

		// TODO: scratch that!!!!! It was just because I calling async functions without await (getters)
		// TODO: Move async logic into the promise.all above
		// TODO: Pass values into the 2nd execution (still have to create the transforms
		//																					in a separate execution step before altering them)

		let countExecutionLoops = 0;
		success = project.executeTransaction((compoundAction) => {
			for (const clip of clipsWithActionsAndInfo) {
				compoundAction.addAction(clip.addTransformAction);
				countExecutionLoops++;
			}
		}, "Fast Transform: Add transform effects to clips");

		if (!success || countExecutionLoops !== clipsWithActionsAndInfo.length)
			throw new Error("ERR: Failed to create transform effect(s)");
	});

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

	//  };

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
	// export type ComponentKeyframesAndValues = Record<string, KeyframesOrValue>;
	// type MotionKeyframesAndValues = {
	// 	position: PointF;
	// scale: number;
	// scaleWidth: number;
	// uniformScale: boolean;
	// rotation: number;
	// anchorPoint: PointF;
	// antiFlickerFilter: number;
	// cropLeft: number;
	// cropTop: number;
	// cropRight: number;
	// 	cropBottom: number;
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
		// console.log(
		// 	"🚀 ~ createTransformFromMotion ~ motionKeyframesAndValues:",
		// 	motionKeyframesAndValues,
		// );

		// const transformParams = {};
		for (let paramIndex = 0; paramIndex < paramsCount; paramIndex++) {
			try {
				const transformParam = transformComponent.getParam(paramIndex);
				let correspondingMotionParamIndex: number = -1;
				// const x = motionKeyframesAndValues[motionParamIndexedKeys[0]];
				// console.log("🚀 ~ createTransformFromMotion ~ paramIndex:", paramIndex);
				// console.log("🚀 ~ createTransformFromMotion ~ transformParam:", transformParam);
				const kf = await transformParam.getStartValue();
				const kfVal = kf.value;
				const kfPos = kf.position;
				// console.log(
				// 	"🚀 ~ createTransformFromMotion ~ transformParam.displayName:",
				// 	paramIndex,
				// 	transformParam.displayName,
				// 	// kfPos,
				// 	kfVal,
				// 	// transformParam,
				// );
				console.log(
					"🚀 ~ createTransformFromMotion ~ motionKeyframesAndValues[motionParamIndexedKeys[]]:",
					paramIndex,
					motionKeyframesAndValues[motionParamIndexedKeys[paramIndex]],
				);

				// transform: anchor point
				if (paramIndex === 0) correspondingMotionParamIndex = 5;
				// transform: position
				else if (paramIndex === 1) {
					correspondingMotionParamIndex = 0;
					motionKeyframesAndValues[motionParamIndexedKeys[0]];
					console.log(
						"🚀 ~ createTransformFromMotion ~ motionKeyframesAndValues[motionParamIndexedKeys[0]]:",
						motionKeyframesAndValues[motionParamIndexedKeys[0]],
					);
					const x = await transformParam.getStartValue();
					console.log("🚀 ~ createTransformFromMotion ~ x:", x);
					// const actions: Action[] = updateTransformParam(
					// 	motionKeyframesAndValues[motionParamIndexedKeys[3]],
					// 	transformParam,
					// );
					// console.log(
					// 	"🚀 ~ createTransformFromMotion ~ motionKeyframesAndValues[motionParamIndexedKeys[3]]:",
					// 	motionKeyframesAndValues[motionParamIndexedKeys[3]],
					// );
				}
				// transform: uniform scale
				else if (paramIndex === 2) {
					correspondingMotionParamIndex = 3;
					// const actions: Action[] = updateTransformParam(
					// 	motionKeyframesAndValues[motionParamIndexedKeys[3]],
					// 	transformParam,
					// );
					// if (actions && actions.length > 0) transferParamsActions.push(...actions);
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
					const actions: Action[] = await updateTransformParam(
						correspondingMotionParam,
						transformParam,
					);
					if (actions && actions.length > 0) transferParamsActions.push(...actions);
				}
			} catch (e) {
				console.error(e);
			}
		}
	}

	project.lockedAccess(() => {
		project.executeTransaction((compoundAction) => {
			for (const action of transferParamsActions) {
				compoundAction.addAction(action);
			}
		}, "Send: Motion -> Transform");
	});
};

// If param doesn't have keyframes this doesn't do anything
const cleanParamKeyframesOrValue = (param: ComponentParam) => {
	const keyframeTimes = param.getKeyframeListAsTickTimes();
	if (keyframeTimes.length === 0) return;

	return param.createRemoveKeyframeRangeAction(keyframeTimes[0], keyframeTimes.at(-1)!);
};

const updateTransformParam = async (
	correspondingMotionParam: KeyframesOrValue,
	transformParam: ComponentParam,
) => {
	const actions: Action[] = [];

	// CLEAN TRANSFORM PARAM (completely override it with motion param)
	const clearTransformParamActions: Action | undefined = cleanParamKeyframesOrValue(transformParam);
	if (clearTransformParamActions) actions.push(clearTransformParamActions); // action

	// MOTION PARAM: KEYFRAMES => TRANSFORM PARAM
	if (correspondingMotionParam.hasKeyframes) {
		const motionKeyframes = correspondingMotionParam.keyframesOrValue as Keyframe[];
		for (const motionKeyframe of motionKeyframes) {
			const addKeyframeAction = transformParam.createAddKeyframeAction(motionKeyframe);
			actions.push(addKeyframeAction);
		}
	}

	// MOTION PARAM: SINGLE VALUE => TRANSFORM PARAM
	else {
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

// 		countExecutionLoops = 0;
// 		success = project.executeTransaction((compoundAction) => {
// 			for (const clip of clipsWithActionsAndInfo) {
// 				console.log("🚀 ~ 2nd execution loop");

// 				// const numParams = newTransformComponent.getParamCount();
// 				// for (let i = 0; i < numParams; i++) {
// 				// 	const param = newTransformComponent.getParam(i);
// 				// 	const keyframes = param.getKeyframeListAsTickTimes();
// 				// 	console.log("🚀 ~ createTransformFromMotion ~ keyframes:", keyframes);

// 				// 	// remove keyframes
// 				// 	if (keyframes.length > 0 && keyframes.at(-1)) {
// 				// 		// for loop:
// 				// 		// const addKeyframeAction = param.createAddKeyframeAction();
// 				// 	} else {
// 				// 		// param.createSetValueAction();
// 				// 	}
// 				// }
// 			}
// 		}, "Fast Transform: Transfer keyframes to Transform Effect");

// 		if (!success || countExecutionLoops !== clipsWithActionsAndInfo.length)
// 			throw new Error("ERR: Failed to transfer Keyframes");
// 	});
// };
/**
				if (motionKeyframesAndValues === undefined)
					throw new Error("ERROR: Failed getting keyframes");

	
				// Action: ADD TRANSFORM TO CLIP
				// ACTION !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
				const addTransformAction =
					components.createAppendComponentAction(transformComponent);

				clipsWithActionsAndInfo.push({
					addTransformAction,
					clipComponents: components,
					motionKeyframesAndValues,
				});
 */
// // SYNC, put in execute
// const x = components.getComponentAtIndex(0);
// const param = x.getParam(0);
// const keyframes = param.getKeyframeListAsTickTimes();
// // remove keyframes
// if (keyframes.length > 0 && keyframes.at(-1)) {
// 	param.createRemoveKeyframeRangeAction(
// 		keyframes[0],
// 		keyframes.at(-1)!,
// 	);
// 	// for loop:
// 	// const addKeyframeAction = param.createAddKeyframeAction();
// } else {
// 	// param.createSetValueAction();
// }

// "Append" adds it as the first effect, just assuming this is the behavior I'd want
// const addTransformAction = await addTransformEffect(clip);
// if (!addTransformAction)
// 	throw new Error("ERROR: Couldn't add transform effect to this clip");
// actions.push(addTransformAction);

// MOVE KEYFRAMES TO TRANSFORM
// TODO: add action
// await transferKeyframesToTransform({
// 	clip,
// 	keyframes: motionKeyframesAndValues,
// 	options,
// });

// DISABLE MOTION / RESET MOTION PROPERTIES TO DEFAULT (params)
// TODO: add action
// returns a promise, should still await

// };

// 	const handleClipPromise = handleClip(); // promise
// 	handleClipPromises.push(handleClipPromise);
// }

// async: get selected clips
// actions: create transforms
// async: get motion keyframes
// async: get transform params
// actions: remove keyframes & add keyframes

// 	const project = await getActiveProject();
// 	project.lockedAccess(() => {
// 		// create all transforms
// 		project.executeTransaction((compoundAction) => {
// 			clipsWithActionsAndInfo.forEach((clip) => {
// 				compoundAction.addAction(clip.addTransformAction);
// 			});
// 		}, "Fast Transform");

// 		// apply settings
// 		project.executeTransaction((compoundAction) => {
// 			clipsWithActionsAndInfo.forEach((clip) => {
// 				const components = clip.clipComponents;
// 				console.log("🚀 ~ createTransformFromMotion ~ components:", components);
// 				const numComponents = components.getComponentCount();
// 				console.log(
// 					"🚀 ~ createTransformFromMotion ~ numComponents:",
// 					numComponents,
// 				);
// 				for (let i = 0; i < numComponents + 1; i++) {
// 					const c = components.getComponentAtIndex(i).getParamCount();
// 					console.log("🚀 ~ createTransformFromMotion ~ c:", c);
// 				}

// 				const newTransformComponent =
// 					components.getComponentAtIndex(numComponents);
// 				console.log(
// 					"🚀 ~ createTransformFromMotion ~ newTransformComponent:",
// 					newTransformComponent,
// 				);
// 				const numParams = newTransformComponent.getParamCount();
// 				for (let i = 0; i < numParams; i++) {
// 					const param = newTransformComponent.getParam(i);
// 					const keyframes = param.getKeyframeListAsTickTimes();
// 					console.log("🚀 ~ createTransformFromMotion ~ keyframes:", keyframes);

// 					// remove keyframes
// 					if (keyframes.length > 0 && keyframes.at(-1)) {
// 						param.createRemoveKeyframeRangeAction(
// 							keyframes[0],
// 							keyframes.at(-1)!,
// 						);
// 						// for loop:
// 						// const addKeyframeAction = param.createAddKeyframeAction();
// 					} else {
// 						// param.createSetValueAction();
// 					}
// 				}
// 			});
// 			// actions.forEach((action) => {
// 			// 	compoundAction.addAction(action);
// 			// });
// 			// compoundAction.addAction;
// 		}, "Fast Transform");
// 	});

// 	// addTransform(clip)
// 	// getComponentKeyframesOrValuesFromClip({clip,componentMatchName: MATCH_NAME_MOTION})
// 	// disableMotion(clip) or deleteMotion(clip)
// };

// const addTransformEffect = async (clip: Clip) => {
// 	if (!isVideoClipTrackItem(clip)) {
// 		console.warn("Clip is not a video clip");
// 		return;
// 	}

// 	const components = await clip.getComponentChain();
// 	const transformComponent =
// 		await premierepro.VideoFilterFactory.createComponent(MATCH_NAME_TRANSFORM);

// 	// "Append" adds it as the first effect, just assuming this is the behavior I'd want
// 	return components.createAppendComponentAction(transformComponent);
// };

// const transferKeyframesToTransform = async ({
// 	clip,
// 	keyframes,
// 	options,
// }: {
// 	clip: Clip;
// 	keyframes: ComponentKeyframesAndValues;
// 	options?: Options;
// }) => {
// 	const components = await clip.getComponentChain();
// 	const componentsLength = components.getComponentCount();

// 	// FIND THE TRANSFORM COMPONENT
// 	let transformComponent: Component | undefined = undefined;
// 	for (let i = 0; i < componentsLength; i++) {
// 		const effectMatchName = await components.getComponentAtIndex(i).getMatchName();
// 		console.log("🚀 ~ transferKeyframesToTransform ~ effectMatchName:", i, effectMatchName);
// 		if (effectMatchName === MATCH_NAME_TRANSFORM) {
// 			transformComponent = components.getComponentAtIndex(i);
// 		}
// 	}
// 	if (transformComponent === undefined) return;

// 	// ADD KEYFRAMES
// 	const numParams = transformComponent.getParamCount();
// 	for (let i = 0; i < numParams; i++) {
// 		const param = transformComponent.getParam(i);
// 		const paramName = param.displayName;
// 		const paramIndex = i;
// 		const value = await param.getStartValue();
// 		console.log(
// 			"🚀 ~ transferKeyframesToTransform ~ paramName:",
// 			paramIndex,
// 			" ",
// 			paramName,
// 			" ",
// 			value,
// 		);
// 		const correspondingKeyframesFromMotion = keyframes[paramName];
// 		if (correspondingKeyframesFromMotion)
// 			setParamKeyframesOrValue(param, correspondingKeyframesFromMotion);
// 	}
// };

// // export type MotionParams = {
// // 	position: PointF;
// // 	scale: number;
// // 	scaleWidth: number;
// // 	uniformScale: boolean;
// // 	rotation: number;
// // 	anchorPoint: PointF;
// // 	antiFlickerFilter: number;
// // 	cropLeft: number;
// // 	cropTop: number;
// // 	cropRight: number;
// // 	cropBottom: number;
// // };

// const setParamKeyframesOrValue = async (
// 	param: ComponentParam,
// 	keyframesOrValue: KeyframesOrValue,
// ) => {
// 	if (keyframesOrValue.hasKeyframes) {
// 		// REMOVE ALL KEYFRAMES FROM PARAM
// 		//   get all kf pos
// 		//   remove all kf by position
// 		// COPY ALL KEYFRAMES INTO PARAM
// 	} else {
// 		// COPY VALUE INTO PARAM
// 	}
// };
