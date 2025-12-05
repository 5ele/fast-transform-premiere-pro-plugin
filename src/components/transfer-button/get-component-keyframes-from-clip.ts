/// <reference path="../../types/ppro.d.ts" />

import { premierepro, uxp } from "../../globals";
import type {
	AudioClipTrackItem,
	Color,
	Component,
	ComponentParam,
	Keyframe,
	PointF,
	TickTime,
	VideoClipTrackItem,
} from "../../types/ppro";
import { getSelectedClipsFromTimeline } from "./get-project-entities";

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
export type ParamValue = string | number | boolean | PointF | Color;

export type KeyframesOrValue = {
	hasKeyframes: boolean;
	keyframesOrValue: ParamValue | Keyframe[];
};

export type ComponentKeyframesAndValues = Record<string, KeyframesOrValue>;

// gets keyframe data, disables the effects
export const getComponentKeyframesOrValuesFromClip = async ({
	componentMatchName,
	clip,
}: {
	componentMatchName: string;
	clip: VideoClipTrackItem | AudioClipTrackItem;
}): Promise<ComponentKeyframesAndValues | undefined> => {
	// let motionParams: MotionParams;
	// let opacityParams: OpacityParams;
	let keyframesAndValues: ComponentKeyframesAndValues;

	try {
		// const selectedClips = await getSelectedClipsFromTimeline();

		// LOOP OVER ALL SELECTED CLIPS (AUDIO + VIDEO)
		// for (const clip of selectedClips) {
		// typeof clip = VideoTrackClipItem | AudioTrackClipItem
		// ------ this guard checks if the clip is a VideoTrackClipItem
		// ------ commented b/c maybe I want it to work with audio effects too
		// if (clip && typeof clip.createAddVideoTransitionAction !== "function")
		// 	return;

		// SEARCH EFFECTS ON CLIP
		const componentChain = await clip.getComponentChain();
		const numComponents = await componentChain.getComponentCount();

		for (let i = 0; i < numComponents; i++) {
			const component = componentChain.getComponentAtIndex(i);
			const matchName = await component.getMatchName();

			// FOUND EFFECT / "component"
			if (matchName === componentMatchName) {
				const params = await getComponentParams(component);
				keyframesAndValues = await getKeyframesAndValuesFromParams(params);

				return keyframesAndValues;
			}
		}
		// }
	} catch (e) {
		console.log("🚀 ~ getComponentKeyframesOrValuesFromSelectedClips ~ e:", e);
		console.error(e);
		return;
	}
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

const getKeyframesAndValuesFromParams = async (params: ComponentParam[]) => {
	const componentKeyframesAndValues: ComponentKeyframesAndValues = {};
	for (const param of params) {
		const paramKeyframesOrValue = await getParamKeyframesOrValue(param);
		componentKeyframesAndValues[param.displayName] = paramKeyframesOrValue;
	}

	return componentKeyframesAndValues;
};

const getParamKeyframesOrValue = async (param: ComponentParam) => {
	const paramKeyframeTimes: TickTime[] = param.getKeyframeListAsTickTimes();
	const keyframes: Keyframe[] = [];

	// no keyframes, return the value
	if (paramKeyframeTimes.length === 0) {
		const startKeyframe = await param.getStartValue();
		console.log("🚀 ~ getParamKeyframesOrValue ~ startKeyframe:", startKeyframe);
		// startKeyframe.value;
		let paramValue = startKeyframe.value.value; // works for number, string, boolean

		// console.log("🚀 ~ getParamKeyframesOrValue ~ startKeyframe.value:", startKeyframe.value);
		// console.log("🚀 ~ getParamKeyframesOrValue ssssssssssssss~ paramValue:", paramValue);
		return { hasKeyframes: false, keyframesOrValue: paramValue };
	}
	// has keyframes
	else {
		paramKeyframeTimes.forEach(async (keyframeTime) => {
			const keyframe = await param.getKeyframePtr(keyframeTime);
			keyframes.push(keyframe);
		});
	}

	return { hasKeyframes: true, keyframesOrValue: keyframes };
};
