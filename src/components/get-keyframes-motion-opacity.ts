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
	Color,
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
export type KeyframesOrValues<T> = {
	hasKeyframes: boolean;
	keyframesOrValue: T | Keyframe[];
};

// KeyframesOrValue stores a bool: are there any keyframes?
// 			- if yes: it stores an array of those keyframes,
//			- if no: 	it stores the value.
export type MotionKeyframesOrValue = {
	position: KeyframesOrValues<PointF>;
	scale: KeyframesOrValues<number>;
	scaleWidth: KeyframesOrValues<number>;
	uniformScale: KeyframesOrValues<boolean>;
	rotation: KeyframesOrValues<number>;
	anchorPoint: KeyframesOrValues<PointF>;
	antiFlickerFilter: KeyframesOrValues<number>;
	cropLeft: KeyframesOrValues<number>;
	cropTop: KeyframesOrValues<number>;
	cropRight: KeyframesOrValues<number>;
	cropBottom: KeyframesOrValues<number>;
};

export type OpacityKeyframesOrValue = {
	opacity: KeyframesOrValues<number>;
	blendMode: KeyframesOrValues<number>;
};

// TODO: 	possible bug, if there are other keyframe types out there other than these.
//				prob only a bug if they change it.
type ParamValue = string | number | boolean | PointF | Color;

// type KeyframesOrValue<T extends ParamValue> = {
// 	hasKeyframes: boolean;
// 	keyframesOrValue: T | Keyframe[];
// };
type KeyframesOrValue = {
	hasKeyframes: boolean;
	keyframesOrValue: ParamValue | Keyframe[];
};

// export type ParamKeyframesOrValues<TComponentParams extends Record<number,KeyframesOrValue<J>>> = {
// 	[K in keyof TComponentParams]: KeyframesOrValue<TComponentParams[K]>;
// };
export type ComponentKeyframesAndValues = Record<number, KeyframesOrValue>;

// indexes
// 0, 1, 2, 3, 4, 5, 6
// Keyframe[] | ParamValue

// gets keyframe data, disables the effects
export const getComponentKeyframesOrValuesFromSelectedClips = async (
	componentMatchName: string,
): Promise<ComponentKeyframesAndValues | undefined> => {
	// let motionParams: MotionParams;
	// let opacityParams: OpacityParams;
	let keyframesAndValues: ComponentKeyframesAndValues;

	try {
		const selectedClips = await getSelectedClipsFromTimeline();
		for (const clip of selectedClips) {
			// typeof clip = VideoTrackClipItem | AudioTrackClipItem
			// ------ this guard checks if the clip is a VideoTrackClipItem
			// ------ commented b/c maybe I want it to work with audio effects too
			// if (clip && typeof clip.createAddVideoTransitionAction !== "function")
			// 	return;

			// SEARCH EFFECTS
			const componentChain = await clip.getComponentChain();
			const numComponents = await componentChain.getComponentCount();

			for (let i = 0; i < numComponents; i++) {
				const component = componentChain.getComponentAtIndex(i);
				const matchName = await component.getMatchName();

				// FOUND EFFECT / "component"
				if (matchName === componentMatchName) {
					const params = await getComponentParams(component);
					keyframesAndValues = await getParamKeyframesOrValues(params);

					return keyframesAndValues;
				}
			}
		}
		// return { motionKeyframes: keyframesOrValues, opacityKeyframes };
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

const getParamKeyframesOrValues = async (params: ComponentParam[]) => {
	const componentKeyframesAndValuesArr = [];

	// get each param's keyframe/value info
	for (let i = 0; i < params.length; i++) {
		const param = params[i];
		const paramKeyframes = await getKeyframes(param); // I have the type now
		componentKeyframesAndValuesArr.push(paramKeyframes);
	}

	// consolidate all param keyframe/value info into an object
	const componentKeyframesAndValues = componentKeyframesAndValuesArr.reduce(
		(result, paramKeyframesValues, index) => {
			result[index] = paramKeyframesValues;
			return result;
		},
		{} as ComponentKeyframesAndValues,
	);

	return componentKeyframesAndValues as ComponentKeyframesAndValues;
};
// const getMotionKeyframes = (params: ComponentParam[]) => {
// 	const keyframes: Partial<MotionKeyframesOrValue> = {
// 		position: { hasKeyframes: false, keyframesOrValue: [] },
// 		scale: { hasKeyframes: false, keyframesOrValue: [] },
// 		scaleWidth: { hasKeyframes: false, keyframesOrValue: [] },
// 		uniformScale: { hasKeyframes: false, keyframesOrValue: [] },
// 		rotation: { hasKeyframes: false, keyframesOrValue: [] },
// 		anchorPoint: { hasKeyframes: false, keyframesOrValue: [] },
// 		antiFlickerFilter: { hasKeyframes: false, keyframesOrValue: [] },
// 		cropLeft: { hasKeyframes: false, keyframesOrValue: [] },
// 		cropTop: { hasKeyframes: false, keyframesOrValue: [] },
// 		cropRight: { hasKeyframes: false, keyframesOrValue: [] },
// 		cropBottom: { hasKeyframes: false, keyframesOrValue: [] },
// 	};

// 	params.forEach(async (param) => {
// 		const paramName = param.displayName as MotionParamDisplayNames;
// 		switch (paramName) {
// 			case "Position":
// 				keyframes.position = await getKeyframes<PointF>(param);
// 				break;
// 			case "Scale":
// 				keyframes.scale = await getKeyframes<number>(param);
// 				break;
// 			case "Scale Width":
// 				keyframes.scaleWidth = await getKeyframes<number>(param);
// 				break;
// 			case " ":
// 				keyframes.uniformScale = await getKeyframes<boolean>(param);
// 				break;
// 			case "Rotation":
// 				keyframes.rotation = await getKeyframes<number>(param);
// 				break;
// 			case "Anchor Point":
// 				keyframes.anchorPoint = await getKeyframes<PointF>(param);
// 				break;
// 			case "Anti-flicker Filter":
// 				keyframes.antiFlickerFilter = await getKeyframes<number>(param);
// 				break;
// 			case "Crop Left":
// 				keyframes.cropLeft = await getKeyframes<number>(param);
// 				break;
// 			case "Crop Top":
// 				keyframes.cropTop = await getKeyframes<number>(param);
// 				break;
// 			case "Crop Right":
// 				keyframes.cropRight = await getKeyframes<number>(param);
// 				break;
// 			case "Crop Bottom":
// 				keyframes.cropBottom = await getKeyframes<number>(param);
// 				break;
// 		}
// 	});

// 	return keyframes as MotionKeyframesOrValue;
// };

// const getOpacityKeyframes = (params: ComponentParam[]) => {
// 	const keyframes: Partial<OpacityKeyframesOrValue> = {
// 		opacity: { hasKeyframes: false, keyframesOrValue: [] },
// 		blendMode: { hasKeyframes: false, keyframesOrValue: [] },
// 	};

// 	params.forEach(async (param) => {
// 		const paramName = param.displayName as OpacityParamDisplayNames;
// 		switch (paramName) {
// 			case "Opacity":
// 				keyframes.opacity = await getKeyframes<number>(param);
// 				break;
// 			case "Blend Mode":
// 				keyframes.blendMode = await getKeyframes<number>(param);
// 				break;
// 		}
// 	});

// 	return keyframes as OpacityKeyframesOrValue;
// };

const getKeyframes = async (param: ComponentParam) => {
	const paramKeyframeTimes: TickTime[] = param.getKeyframeListAsTickTimes();
	const keyframes: Keyframe[] = [];

	// no keyframes, return the value
	if (paramKeyframeTimes.length === 0) {
		const startKeyframe = await param.getStartValue();
		const paramValue = startKeyframe.value.value;
		return { hasKeyframes: false, keyframesOrValue: paramValue };
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
