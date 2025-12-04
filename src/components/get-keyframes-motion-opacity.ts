/// <reference path="../types/ppro.d.ts" />

import { premierepro, uxp } from "../globals";
import {
	MATCH_NAME_MOTION,
	MATCH_NAME_OPACITY,
} from "../types/effect-match-names";
import {
	MotionParamDisplayNames,
	OpacityParamDisplayNames,
} from "../types/effect-param-display-names";
import {
	Component,
	ComponentParam,
	Keyframe,
	PointF,
	TickTime,
} from "../types/ppro";

export type MotionParams = {
	position: PointF;
	scale: number;
	scaleWidth: number;
	uniformScale: boolean;
	rotation: number;
	anchorPoint: PointF;
	antiFlickerFilter: number;
	cropLeft: number;
	cropTop: number;
	cropRight: number;
	cropBottom: number;
};
export type OpacityParams = {
	opacity: number;
	blendMode: number;
};

// TODO: 	refactor to just return Keyframe[]. Not really any point to
// 				just return this info.
// type KeyframeInfo<T> = {
// 	tickTime: TickTime;
// 	value: T;
// };
export type KeyframesOrValue<T> = {
	hasKeyframes: boolean;
	keyframesOrValue: T | Keyframe[];
};

// KeyframesOrValue stores a bool: are there any keyframes?
// 			- if yes: it stores an array of those keyframes,
//			- if no: 	it stores the value.
export type MotionKeyframesOrValue = {
	position: KeyframesOrValue<PointF>;
	scale: KeyframesOrValue<number>;
	scaleWidth: KeyframesOrValue<number>;
	uniformScale: KeyframesOrValue<boolean>;
	rotation: KeyframesOrValue<number>;
	anchorPoint: KeyframesOrValue<PointF>;
	antiFlickerFilter: KeyframesOrValue<number>;
	cropLeft: KeyframesOrValue<number>;
	cropTop: KeyframesOrValue<number>;
	cropRight: KeyframesOrValue<number>;
	cropBottom: KeyframesOrValue<number>;
};

export type OpacityKeyframesOrValue = {
	opacity: KeyframesOrValue<number>;
	blendMode: KeyframesOrValue<number>;
};

// gets keyframe data, disables the effects
export const getKeyframesFromMotionAndOpacity = async (): Promise<
	| {
			motionKeyframes: MotionKeyframesOrValue;
			opacityKeyframes: OpacityKeyframesOrValue;
	  }
	| undefined
> => {
	// let motionParams: MotionParams;
	// let opacityParams: OpacityParams;
	let opacityKeyframes: OpacityKeyframesOrValue;
	let motionKeyframes: MotionKeyframesOrValue;

	try {
		const selectedClips = await getSelectedClipsFromTimeline();
		for (const clip of selectedClips) {
			// clipInTimeline: VideoTrackClipItem | AudioTrackClipItem
			// - this guard checks if the clip is a VideoTrackClipItem
			if (clip && typeof clip.createAddVideoTransitionAction !== "function")
				return;

			// SEARCH EFFECTS FOR MOTION & OPACITY
			const componentChain = await clip.getComponentChain();
			const numComponents = await componentChain.getComponentCount();

			for (let i = 0; i < numComponents; i++) {
				const component = componentChain.getComponentAtIndex(i);
				const matchName = await component.getMatchName();

				// FOUND MOTION EFFECT/"component"
				if (matchName === MATCH_NAME_MOTION) {
					const params = await getComponentParams(component);
					motionKeyframes = getMotionKeyframes(params);
					console.log(
						"🚀 ~ getKeyframesFromMotionAndOpacity ~ motionKeyframes:",
						motionKeyframes,
					);
				}
				// FOUND OPACITY EFFECT/"component"
				else if (matchName === MATCH_NAME_OPACITY) {
					const params = await getComponentParams(component);
					opacityKeyframes = getOpacityKeyframes(params);
					console.log(
						"🚀 ~ getKeyframesFromMotionAndOpacity ~ opacityKeyframes:",
						opacityKeyframes,
					);
				}
			}
		}
		return { motionKeyframes, opacityKeyframes };
	} catch (e) {
		console.error(e);
		return;
	}
};

// Track Item === Clip in the timeline
const getSelectedClipsFromTimeline = async () => {
	const proj = await premierepro.Project.getActiveProject();
	const sequence = await proj.getActiveSequence();
	const selection = await sequence.getSelection();
	return await selection.getTrackItems();
};

const getComponentParams = async (component: Component) => {
	const numParams = component.getParamCount();
	const params = [];
	for (let j = 0; j < numParams; j++) {
		const param = component.getParam(j);
		params.push(param);
	}
	return params;
};

const getMotionKeyframes = (params: ComponentParam[]) => {
	const keyframes: Partial<MotionKeyframesOrValue> = {
		position: { hasKeyframes: false, keyframesOrValue: [] },
		scale: { hasKeyframes: false, keyframesOrValue: [] },
		scaleWidth: { hasKeyframes: false, keyframesOrValue: [] },
		uniformScale: { hasKeyframes: false, keyframesOrValue: [] },
		rotation: { hasKeyframes: false, keyframesOrValue: [] },
		anchorPoint: { hasKeyframes: false, keyframesOrValue: [] },
		antiFlickerFilter: { hasKeyframes: false, keyframesOrValue: [] },
		cropLeft: { hasKeyframes: false, keyframesOrValue: [] },
		cropTop: { hasKeyframes: false, keyframesOrValue: [] },
		cropRight: { hasKeyframes: false, keyframesOrValue: [] },
		cropBottom: { hasKeyframes: false, keyframesOrValue: [] },
	};

	params.forEach(async (param) => {
		const paramName = param.displayName as MotionParamDisplayNames;
		switch (paramName) {
			case "Position":
				keyframes.position = await getKeyframes<PointF>(param);
				break;
			case "Scale":
				keyframes.scale = await getKeyframes<number>(param);
				break;
			case "Scale Width":
				keyframes.scaleWidth = await getKeyframes<number>(param);
				break;
			case " ":
				keyframes.uniformScale = await getKeyframes<boolean>(param);
				break;
			case "Rotation":
				keyframes.rotation = await getKeyframes<number>(param);
				break;
			case "Anchor Point":
				keyframes.anchorPoint = await getKeyframes<PointF>(param);
				break;
			case "Anti-flicker Filter":
				keyframes.antiFlickerFilter = await getKeyframes<number>(param);
				break;
			case "Crop Left":
				keyframes.cropLeft = await getKeyframes<number>(param);
				break;
			case "Crop Top":
				keyframes.cropTop = await getKeyframes<number>(param);
				break;
			case "Crop Right":
				keyframes.cropRight = await getKeyframes<number>(param);
				break;
			case "Crop Bottom":
				keyframes.cropBottom = await getKeyframes<number>(param);
				break;
		}
	});

	return keyframes as MotionKeyframesOrValue;
};

const getOpacityKeyframes = (params: ComponentParam[]) => {
	const keyframes: Partial<OpacityKeyframesOrValue> = {
		opacity: { hasKeyframes: false, keyframesOrValue: [] },
		blendMode: { hasKeyframes: false, keyframesOrValue: [] },
	};

	params.forEach(async (param) => {
		const paramName = param.displayName as OpacityParamDisplayNames;
		switch (paramName) {
			case "Opacity":
				keyframes.opacity = await getKeyframes<number>(param);
				break;
			case "Blend Mode":
				keyframes.blendMode = await getKeyframes<number>(param);
				break;
		}
	});

	return keyframes as OpacityKeyframesOrValue;
};

const getKeyframes = async <T>(
	param: ComponentParam,
): Promise<KeyframesOrValue<T>> => {
	const paramKeyframeTimes: TickTime[] = param.getKeyframeListAsTickTimes();
	const keyframes: Keyframe[] = [];

	// no keyframes, return the value
	if (paramKeyframeTimes.length === 0) {
		const startKeyframe = await param.getStartValue();
		const paramValue = startKeyframe.value.value;
		return { hasKeyframes: false, keyframesOrValue: paramValue as T };
	}
	// has keyframes
	else {
		paramKeyframeTimes.forEach(async (keyframeTime) => {
			const keyframe = await param.getKeyframePtr(keyframeTime);

			keyframes.push(keyframe);
		});
	}

	console.log("🚀 ~ getKeyframes ~ keyframes:", keyframes);
	return { hasKeyframes: true, keyframesOrValue: keyframes };
};

// //TODO: possible bug:
// // 				- assumes every param has a value
// const getMotionParams = async (component: Component): MotionParams => {
// 	const motionParams: Partial<MotionParams> = {
// 		position: [Infinity, Infinity],
// 		scale: -1,
// 		scaleWidth: -1,
// 		uniformScale: true,
// 		rotation: -1,
// 		anchorPoint: [Infinity, Infinity],
// 		antiFlickerFilter: -1,
// 		cropLeft: -1,
// 		cropTop: -1,
// 		cropRight: -1,
// 		cropBottom: -1,
// 	};
// 	const numParams = component.getParamCount();

// 	let s: string[] = [];

// 	for (let j = 0; j < numParams; j++) {
// 		const param = component.getParam(j);
// 		const startKeyframe = await param.getStartValue();
// 		const paramValue = startKeyframe.value.value;
// 		const paramName = param.displayName as MotionParamDisplayNames;
// 		const areKeyframesSupported = await param.areKeyframesSupported();

// 		// console.log("🚀 ~ getMotionParams ~ paramName:", paramValue);
// 		// if (paramName ===) {

// 		// }
// 	}
// 	console.log(s.join(" | "));

// 	return motionParams as MotionParams;
// };

// const getOpacityParams = async (
// 	component: Component,
// ): Promise<OpacityParams> => {
// 	const opacityParams: Partial<OpacityParams> = {
// 		opacity: -1,
// 		blendMode: -1,
// 	};

// 	const numParams = component.getParamCount();
// 	for (let j = 0; j < numParams; j++) {
// 		let isFirstBlendModeParam = true;

// 		const param = component.getParam(j);
// 		const startKeyframe = await param.getStartValue();
// 		const paramValue = startKeyframe.value.value;
// 		const paramName = param.displayName as OpacityParamDisplayNames;
// 		// const areKeyframesSupported = await param.areKeyframesSupported();

// 		// opacity
// 		if (paramName === "Opacity") {
// 			opacityParams.opacity = paramValue as number;
// 		}
// 		// blend mode
// 		//   (2) blend mode params, but the 1st is useless.
// 		//   set it both times... the 2nd value overwrites the first
// 		else if (paramName === "Blend Mode") {
// 			opacityParams.blendMode = paramValue as number;
// 		}
// 	}

// 	return opacityParams as OpacityParams;
// };
