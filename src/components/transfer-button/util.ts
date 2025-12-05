import { Clip } from "./types";

// TODO: this is probably not working...................
export const isVideoClipTrackItem = (clip: Clip) => {
	if (clip && typeof clip.createAddVideoTransitionAction !== "function") return false;
	else return true;
};
