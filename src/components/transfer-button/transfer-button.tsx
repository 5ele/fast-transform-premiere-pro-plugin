import { transferKeyframesToTransform } from "./transfer-keyframes-to-transform";

export const TransferButton = () => {
	const handleClick = async () => {
		await transferKeyframesToTransform({ includeOpacity: true });
	};
	// const handleClick = async () => {
	// 	const motionKeyframes =
	// 		await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_MOTION);
	// 	const opacityKeyframes =
	// 		await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_OPACITY);

	// 	console.log("🚀 ~ handleClick ~ motionKeyframes:", motionKeyframes);
	// 	console.log("🚀 ~ handleClick ~ opacityKeyframes:", opacityKeyframes);
	// };

	return (
		<button onClick={handleClick}>
			transfer Motion keyframes and values to Transform
		</button>
	);
};
