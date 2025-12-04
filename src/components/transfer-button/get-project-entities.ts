import { premierepro } from "../../globals";

export const getSelectedClipsFromTimeline = async () => {
	const proj = await getActiveProject();
	const sequence = await proj.getActiveSequence();
	const selection = await sequence.getSelection();
	return await selection.getTrackItems();
};

export const getActiveProject = async () => {
	return await premierepro.Project.getActiveProject();
};
