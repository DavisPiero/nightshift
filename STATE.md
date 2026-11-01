# NIGHTSHIFT: state

_Last updated 2026-11-01, session 19. Part 3 of Arlo's fourth notes (environments) is merged and live._

## Where we are
Yamagiri Pass, a mountain track with real hills. Parabolica Street lined with cherry blossom. Far city and mountains baked into the sky. New trees and buildings. Every Street track open to race. Dave in his cabin window, laptops leaning left, no headlights at sunset.

## Next
- **Part 4:** phone contacts and favours, one every 24 real hours per person; Sonny after Under the City, with invites (500 CR entry, podium or nothing, one try, one difficulty step up, about twice your top event); Johnny 10% off one type of car; Dave's quests for a discount on any car. Sonny's invites are a good home for Yamagiri Pass, which has no Career events yet.
David said: push each part when finished, without asking.

## Open with David
- Can Claude download free CC0 textures and tree models (Poly Haven, ambientCG), credited in the README? His answers skipped this, so everything is still drawn in code.
- Does "race any map in my stage" cover only Race, Time Trial and Practice? Career events are still on their set tracks.
- Is Yamagiri Pass the right name, and are 3 laps (over 5 minutes) too long? Does the mountain feel right to drive? Nobody here has felt the hills.
- Try it on a real iPad: never done, and this update is the heaviest yet.
- Is sunset too dark without headlights, on the mountain most of all?
- Sprite sheets for Sonny and Dave are coming from him (5 across, 4 down, on black). Same question for Max and Aoi.
- Guesses (session 19): Dave's cabin layout; the mountain's layout, landmarks, name and blurb; tree spacing; petal amounts; the number of far towers.
- Guesses (session 18): Dave's lines, backstory and sign; the look of the lot; the laptop's size on screen; the race laptop's new angle; Analytics columns and "Most trouble" wording; you counted as mid-field in the prediction; headlight strength; pull-up timing; NOS sounds.
- Does NOS feel right? Are the headlights bright enough (one number in `car-model.js`)? Does the racing feel right (F4 > Camera: speed feel)? Is the small text right?
- Hard: a limit bot from last finishes 4th to 7th. Is that too hard for a person?
- Guesses (session 16): style numbers; 30% slipstream; Underground 1.46 km; ghost is best lap.
- Guesses (session 15): rival level rule; Skyliner and Mustank prices; event names and order; XP; replay pay; the scout Aoi; Medium 480 and High 600 lines; start positions; Race pay.
- The Subaru's source: no author or licence. Mustank: its real sponsor livery shows on a shop card.
- Guesses (older): Impreza 146 hp and four-wheel drive; "Late 90s"; Countash numbers; near-miss names; Mustank seat and cabin; dial size; feel of the slower cars; handbrake lever; sun glare; engine sounds; tips' wording; rim sizes.

## Known rough edges
- Dave's roof sign is half hidden by the top bar in the Shop.
- The smoke test's 200 m race limit is tight on the mountain: an uphill start in traffic gets 197 to 230 m in 20 s, so that run can fail with nothing wrong. `tools/smoke.sh` runs it in the rain, which got 230 m.
- The mountain's rock is one tile of grey, stretched on steep faces.
- Rivals touch the walls more on Hard on the narrow Starter, and on Impossible more still.
- At speed the stars streak with the motion blur.
- The cranes in the docks picture float a little. Johnny has no blink.
- The phone and laptops have not been tried on a real iPad.
- The Shop tile on the home screen still shows the Underground, not Dave's lot.
- Only the player has engine sound, smoke and sparks.
- Old drawn-car code and `src/ui/menus.js` are dead but still there. Car files about 50 MB.
