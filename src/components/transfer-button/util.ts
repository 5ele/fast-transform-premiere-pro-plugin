import { Clip } from "./types";

export const isVideoClipTrackItem = (clip: Clip) => {
	if (clip && typeof clip.createAddVideoTransitionAction !== "function")
		return false;
	else return true;
};
