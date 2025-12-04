import { premierepro } from "../../globals";

export const getSelectedClipsFromTimeline = async () => {
	const proj = await premierepro.Project.getActiveProject();
	const sequence = await proj.getActiveSequence();
	const selection = await sequence.getSelection();
	return await selection.getTrackItems();
};
