/// <reference path="./types/ppro.d.ts" />

import type React from "react";
import { useEffect, useState } from "react";
import { api } from "./api/api";
import boltUxpLogo from "./assets/bolt-uxp.png";
import reactLogo from "./assets/react.png";
import sassLogo from "./assets/sass.png";
import tsLogo from "./assets/typescript.png";
import viteLogo from "./assets/vite.png";
import { getComponentKeyframesOrValuesFromSelectedClips } from "./components/get-keyframes-motion-opacity";
import { premierepro, uxp } from "./globals";
import {
	MATCH_NAME_MOTION,
	MATCH_NAME_OPACITY,
} from "./types/effect-match-names";
import { AudioClipTrackItem, VideoClipTrackItem } from "./types/ppro";

declare global {
	namespace JSX {
		interface IntrinsicElements {
			"uxp-panel": React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & { panelid?: string },
				HTMLElement
			>;
		}
	}
}

/**
 * shape:
 * premierepro > Project > Sequence > Selection > Tracks > Track > Components > Component > Params > Param
 * Components are "effects"
 * Params are params like "scale", "position", ...
 */

export const App = () => {
	const [count, setCount] = useState<any>();
	const handleClick = async () => {
		const motionKeyframes =
			await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_MOTION);
		const opacityKeyframes =
			await getComponentKeyframesOrValuesFromSelectedClips(MATCH_NAME_OPACITY);
		console.log("🚀 ~ handleClick ~ keyframes:", motionKeyframes);
		console.log("🚀 ~ handleClick ~ opacityKeyframes:", opacityKeyframes);
		setCount(String(motionKeyframes));
	};
	const handleSettingsClick = async () => {};
	// const increment = () => setCount((prev) => prev + 1);

	return (
		<div>
			<p>Does NOT transfer keyframe easing!</p>
			<button onClick={handleClick}>click me! {count}</button>

			<label htmlFor="opacity-checkbox">include opacity?</label>
			<input id="opacity-checkbox" type="checkbox" checked></input>
		</div>
	);
	// const webviewUI = import.meta.env.VITE_BOLT_WEBVIEW_UI === "true";

	// const [count, setCount] = useState(0);
	// const increment = () => setCount((prev) => prev + 1);

	// const hostName = (uxp.host.name as string).toLowerCase();

	// //* Call Functions Conditionally by App
	// if (hostName === "premierepro") {
	// 	console.log("Hello from Premiere Pro", premierepro);
	// }

	// * Or call the unified API object directly and the correct app function will be used
	// const simpleAlert = () => {
	// 	api.notify("Hello World");
	// };
	// return (
	// 	<>
	// 		{!webviewUI ? (
	// 			<main>
	// 				<div>
	// 					<img className="logo-lg" src={boltUxpLogo} alt="" />
	// 				</div>
	// 				<div className="stack-icons">
	// 					<img src={viteLogo} className="logo" alt="" />
	// 					<span> + </span>
	// 					<img src={reactLogo} className="logo" alt="" />
	// 					<span> + </span>
	// 					<img src={tsLogo} className="logo" alt="" />
	// 					<span> + </span>
	// 					<img src={sassLogo} className="logo" alt="" />
	// 				</div>
	// 				<div className="button-group">
	// 					<button onClick={increment}>count is {count}</button>
	// 					<button onClick={simpleAlert}>Alert</button>
	// 				</div>
	// 				<div>
	// 					<p>
	// 						Edit <span className="code">main.tsx</span> and save to test HMR
	// 						updates.
	// 					</p>
	// 				</div>
	// 				<div className="button-group">
	// 					<a href="https://github.com/hyperbrew/bolt-uxp/">Bolt UXP Docs</a>
	// 					<a href="https://svelte.dev">Svelte Docs</a>
	// 					<a href="https://vitejs.dev/">Vite Docs</a>
	// 				</div>
	// 			</main>
	// 		) : (
	// 			<></>
	// 		)}

	// 		{/* Example of a secondary panel entrypoint
	//     <uxp-panel panelid="bolt.uxp.plugin.settings">
	//       <h1>Settings Panel</h1>
	//       <p>count is: {count}</p>
	//     </uxp-panel>
	//     */}
	// 	</>
	// );
};
