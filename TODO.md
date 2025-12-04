Flows:

- transfer keyframes
  - just disables the entire effect for Motion (possibly opacity too)
- CANNOT TRANSFER KEYFRAME EASING


Nomenclature:
component: effect
param: effect param

- [ ] TODO: >>>> transfer-keyframes-to-transform.ts <<<<

- [ ] Use a **Compound action** when creating:
  - the transform effect
  - the keyframes on the transform effect
- so you can just hit undo once
- IDEAL: 1-button to do something can be undone with 1 undo.


- [ ] think about breaking down the getComponentKeyframesOrValuesFromSelectedClips function so I can call it on just one of many selected clips.