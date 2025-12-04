/// <reference path="../types/ppro.d.ts" />

import { premierepro, uxp } from "../globals";
import { Component } from "../types/ppro";

export type MotionParams = {
	position: number;
	scale: number;
	scaleWidth: number;
	uniformScale: number;
	rotation: number;
	anchorPoint: number;
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

export const MATCH_NAME_MOTION = "AE.ADBE Motion";
export const MATCH_NAME_OPACITY = "AE.ADBE Opacity";

type OpacityParamDisplayNames = "Opacity" | "Blend Mode";

export const getKeyframesFromMotionAndOpacity = async () => {
	let motionParams: MotionParams;
	let opacityParams: OpacityParams;

	try {
		const selectedClips = await getSelectedClipsFromTimeline();
		selectedClips.map(async (clip) => {
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
				console.log("🚀 ~ getSelected ~ matchName:", matchName);

				// FOUND MOTION
				if (matchName === MATCH_NAME_MOTION) {
					motionParams = getMotionParams(component);
				}
				// FOUND OPACITY
				else if (matchName === MATCH_NAME_OPACITY) {
					opacityParams = await getOpacityParams(component);
					console.log(
						"🚀 ~ getKeyframesFromMotionAndOpacity ~ opacityParams:",
						opacityParams,
					);
				}
			}
		});
	} catch (e) {
		console.error(e);
	}
};

// Track Item === Clip in the timeline
const getSelectedClipsFromTimeline = async () => {
	const proj = await premierepro.Project.getActiveProject();
	const sequence = await proj.getActiveSequence();
	const selection = await sequence.getSelection();
	return await selection.getTrackItems();
};

const getMotionParams = (component: Component) => {
	const numParams = component.getParamCount();
	for (let j = 0; j < numParams; j++) {
		const param = component.getParam(j);
		// console.log("🚀 ~ getSelected ~ param:", param);
		param;
	}
};

const getOpacityParams = async (
	component: Component,
): Promise<OpacityParams> => {
	const opacityParams: Partial<OpacityParams> = {
		opacity: -1,
		blendMode: -1,
	};

	const numParams = component.getParamCount();
	for (let j = 0; j < numParams; j++) {
		let isFirstBlendModeParam = true;

		const param = component.getParam(j);
		const startKeyframe = await param.getStartValue();
		const paramValue = startKeyframe.value.value;
		const paramName = param.displayName as OpacityParamDisplayNames;
		const areKeyframesSupported = await param.areKeyframesSupported();

		// opacity
		if (paramName === "Opacity") {
			opacityParams.opacity = paramValue as number;
		}
		// blend mode
		//   (2) blend mode params, but the 1st is useless.
		//   set it both times... the 2nd value overwrites the first
		else if (paramName === "Blend Mode") {
			opacityParams.blendMode = paramValue as number;
		}
	}

	return opacityParams as OpacityParams;
};
