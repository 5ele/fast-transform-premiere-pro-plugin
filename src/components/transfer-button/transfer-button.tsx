import { useState } from "react";
import { motionKeyframesToTransformEffect } from "./transfer-keyframes-to-transform";

export const TransferButton = () => {
	const [output, setOutput] = useState("");
	const handleClick = async () => {
		try {
			const response = await motionKeyframesToTransformEffect("all");

			const textRes = JSON.stringify(response);
			setOutput(textRes);
		} catch (e) {
			const msg = e instanceof Error ? e.message : JSON.stringify(e);
			setOutput(msg);
		}
	};

	// const handleTestClick = async () => {
	// 	const res = await motionKeyframesToTransformEffect("all");
	// };
	// const handleClick = async () => {
	// 	const motionKeyframes =
	// 		await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_MOTION);
	// 	const opacityKeyframes =
	// 		await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_OPACITY);

	// 	console.log("🚀 ~ handleClick ~ motionKeyframes:", motionKeyframes);
	// 	console.log("🚀 ~ handleClick ~ opacityKeyframes:", opacityKeyframes);
	// };

	return (
		<div>
			<button onClick={handleClick}>
				transfer Motion keyframes and values to Transform
			</button>
			{/* <button onClick={handleTestClick}>test</button> */}
			<div
				style={{
					width: 400,
					height: 400,
					backgroundColor: "white",
					color: "black",
				}}
			>
				{output}
			</div>
		</div>
	);
};
