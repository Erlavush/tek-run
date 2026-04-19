# Event Process Log

This file is the running record of the full event workflow.

## Purpose

- Capture each process step during the event
- Keep the sequence clear for review later
- Record notes, issues, and decisions in one place

## Event Details

- Event name: To be provided
- Event date: To be provided
- Location: To be provided
- Main operator: User
- Event window: 4:00 AM to 6:00 AM

## Recording Format

For each update, add:

- Time
- Process or activity
- People involved
- Equipment used
- Result
- Issues or notes

## Event Timeline

Updates will be added here as you send them.

### Planning Notes - Initial Full Workflow Dump

Time: 2026-04-19

Process or activity:
- Initial planning capture of the full event workflow, hardware setup, operator duties, camera flow, and bib detection requirements

People involved:
- Main operator: User
- Second personnel: Manual verification / support
- Drone personnel: Separate drone operator
- Event organizer: Provides bib masterlist Excel file
- Zumba leader: Requests drone coverage during zumba

Equipment used:
- Laptop 1: Operator laptop
- Laptop 2: Secondary laptop
- Camera 1: DJI camera at start/finish line
- Camera 2: Drone camera
- TV screen requested
- Large LED screen around 70 meters from operator position

Result:
- Core event requirements captured for system planning and operator workflow design

Issues or notes:
- Operator is unsure how the drone feed should connect into the laptop and public display workflow
- Operator needs a simple switching method between Camera 1 and Camera 2
- Operator needs a reliable start-run and end-run flow
- Bib detection approach is still unclear and current YOLO attempt is not producing reliable bib reads

## Current Known Event Setup

- The event runs from 4:00 AM to 6:00 AM
- There is a zumba session from 4:00 AM to 4:30 AM
- The race start and finish use the same physical area
- Camera 1 is a DJI camera fixed at the start/finish line
- Camera 2 is a drone handled by a separate drone operator
- The operator controls the public view shown on a TV screen and a large LED screen
- The LED screen is about 70 meters away from the operator laptop position
- Two laptops and two personnel are available
- The operator wants the public display to switch between camera feeds during the event

## Required Camera Flow

- During zumba from 4:00 AM to 4:30 AM:
  - Public view should show the drone feed
- After zumba:
  - Public view should switch back to Camera 1 at the start/finish line
- During the race:
  - Camera 1 should remain the primary source for finish-line monitoring and bib detection
- The operator view should control which camera is shown in the public view

## Required Race Control Flow

- The operator view needs a `Start Run` button
- When `Start Run` is pressed:
  - The system must capture the current time
  - That time becomes the official `START TIME`
  - The `START TIME` should be treated as final and unchangeable during the run
  - The `RACE TIME` display starts counting from that exact start time
- The operator view also needs an `End Run` button
- When `End Run` is pressed:
  - The `RACE TIME` display stops
  - The system marks the race as ended
  - The public or operator view should show a clear race-ended status such as `RUN ENDED`

## Required Finish Detection Flow

- A runner crosses the finish line
- The system uses Camera 1 to detect that crossing event
- At the crossing moment, the system should:
  - capture the timestamp
  - attempt to read the bib number
  - save the detected result into the event database
- The event organizer will provide an Excel file with:
  - column 1: bib number
  - column 2: runner name
  - column 3: gender
- The system should use that Excel file as a bib-to-name-and-gender lookup table
- Once a bib is detected:
  - the operator view should show the detected bib
  - the system should look up the runner name and gender from the organizer file
  - the record should be written to the event result file

## Required Manual Fallback Flow

- A second personnel should verify whether the detected bib is correct
- If the system misses the bib or reads it incorrectly:
  - the personnel should manually enter or correct the bib
- Manual fallback must be fast and easy because finishers may arrive very close together
- Manual correction should still preserve the correct finish timestamp whenever possible

## XLSX Database Behavior Requirement

- The Excel file is the working event database
- When a bib is detected or manually entered:
  - the system must write the bib into the Excel file
  - the system must write the exact finish timestamp for that runner
- The dashboard should use the Excel file as the live source of truth

### Leaderboard Requirement From Excel

- The public view leaderboard must read from the Excel database file
- Male leaderboard:
  - use the top 1 to top 3 male finishers from the database
- Female leaderboard:
  - use the top 1 to top 3 female finishers from the database

### Latest Runner Requirement From Excel

- The public view must show:
  - latest male runner
  - latest female runner
- The latest male runner must come from the newest valid row in the male table
- The latest female runner must come from the newest valid row in the female table

## Locked Excel Structure

- The live event database Excel file contains two separate tables:
  - Male table
  - Female table
- The system must write each finisher into the correct table based on gender

Recommended columns for both tables:
- finish_order
- bib_number
- runner_name
- gender
- finish_timestamp
- finish_time_from_start
- source
- confidence
- review_status

## Public View Data Rules From Excel

- Male leaderboard:
  - use rows 1 to 3 from the male table
- Female leaderboard:
  - use rows 1 to 3 from the female table
- Latest male:
  - use the newest or bottom-most valid row from the male table
- Latest female:
  - use the newest or bottom-most valid row from the female table

## Recommended System Architecture

- Use Camera 1 as the official detection camera
- Treat the drone only as a display camera, not as the official finish-detection camera
- Use the operator laptop as the central switching and control device
- Output the operator-selected public feed to the TV and LED screen
- Keep the detection pipeline tied only to Camera 1 so that switching to drone view does not break finish logging logic

## Recommended Practical Video Setup

- Best option:
  - Camera 1 feeds the detection app on the operator laptop
  - Camera 2 drone feed is handled separately for public display switching
  - A switching layer chooses what the audience sees
- Practical choices for the switching layer:
  - OBS on the operator laptop
  - Hardware video switcher
  - A custom app if both feeds enter the laptop cleanly

## Strong Recommendation About The Drone

- Do not make the drone the official bib-detection camera
- Use the drone only for:
  - zumba coverage
  - crowd shots
  - scenic public-view shots
- Reason:
  - drone footage is unstable
  - bib OCR becomes much harder with movement, distance, changing angle, and compression
  - finish-line timing needs a fixed camera angle

## Recommended Detection Pipeline

- Step 1:
  - Use a fixed camera view of the finish line
- Step 2:
  - Detect people in the frame
- Step 3:
  - Track each runner as a unique object across frames
- Step 4:
  - Define a virtual finish line in the frame
- Step 5:
  - Trigger a finish event when the tracked runner crosses that line
- Step 6:
  - Crop the bib region for that runner
- Step 7:
  - Run OCR or bib-reading logic on the crop
- Step 8:
  - Match the bib against the organizer Excel masterlist
- Step 9:
  - Save timestamp, bib, name, gender, confidence, and review status
- Step 10:
  - Allow manual correction if confidence is low

## Important Technical Note About YOLO

- YOLO alone is not enough to solve the whole problem
- A working finish-line system usually needs:
  - person detection
  - object tracking
  - line-crossing event logic
  - OCR or bib reading
  - duplicate prevention
  - manual review tools
- If the current model only tries to detect bib numbers directly in wide race footage, that is likely one reason it is struggling

## Main Open Problems To Solve

- How exactly the drone feed enters the operator laptop
- Whether OBS or another switcher will be used for public display
- How the LED screen receives signal from 70 meters away
- What exact OCR stack will be used for bib reading
- How to define the finish line crossing rule accurately
- How to protect against duplicate reads for the same runner
- How to manage close finishes with overlapping runners

## Immediate Planning Direction

- Build around a fixed official finish camera
- Keep drone handling separate from finish detection
- Design one operator interface for:
  - start run
  - end run
  - latest detection
  - manual correction
  - public feed status
- Use the organizer Excel sheet as the source of truth for name and gender mapping
- Treat low-confidence auto-detections as review items, not final truth

## Drone Feed Research Notes

- Exact drone workflow cannot be finalized until the exact drone model and exact controller model are known
- DJI support materials show that output and livestream options vary by controller family
- Some DJI controllers do not provide HDMI output
- Some higher-end DJI controllers do provide HDMI or other video-output options
- Some DJI setups support RTMP live streaming through DJI Fly or a connected mobile-device workflow

### Practical Meaning For This Event

- Do not assume that any DJI drone can be plugged directly into the operator laptop like a webcam
- The safest race-day plan is to identify the controller first, then choose one of these paths:
  - HDMI output from controller into capture card into OBS
  - RTMP stream from DJI app into OBS if supported by the exact drone/controller setup
  - Secondary device receives the drone feed, then forwards it to OBS

### Current Best Recommendation For The Drone

- Treat the drone as a separate public-view source
- Let the drone operator focus only on safe flight and composition
- Let the main operator focus on OBS scene switching and timing operations
- Do not make the success of finish detection depend on the drone feed

## Operator Success Checklist Draft

- Learn only one public-display action first: switch OBS between `Zumba Drone` and `Race Main Camera`
- Learn only two race-control actions first: `Start Run` and `End Run`
- Keep one screen near you that always mirrors the LED output
- Keep one fixed finish camera that never moves during the race
- Keep the second personnel responsible for manual bib verification
- Treat auto bib detection as assistance, not as perfect truth

## Next Information Needed From User

- Exact drone model
- Exact drone controller model
- Exact fixed DJI camera model at the start/finish line
- Whether the LED wall accepts HDMI from the operator side
- Whether the two laptops will be connected on the same local network
- Sample organizer Excel file format

## Operator UI Direction Locked

- The public view remains the first-priority polished screen
- The operator view must be simplified heavily
- Remove operator-screen elements that are not yet race-critical

### Keep In Operator View

- Main camera preview
- Simple race status
- `Start Run` button
- `End Run` button
- `Restart Run` button for resetting the operator state after a completed run
- Manual bib entry
- Latest logged finisher
- Public display open button

### Remove From Main Operator View For Now

- Settings drawer as a primary workflow
- Export controls
- Health and session logs
- Large recent-finishers table
- Editable manual date-time start field
- Nonessential mock-session controls

### Operator UI Goal

- The operator should be able to understand the screen in a few seconds
- The screen should focus only on what is needed during live event pressure

## Public View Layout Refinement

- The lower-right public-view area was adjusted for cleaner alignment
- The running logo was moved into the center space between the `START TIME` and `RACE TIME` cards
- The old center `-` dash between those two cards was removed completely
- The `RACE TIME` label should be larger for better readability from distance
- The live race timer digits should use a flat `#ef0114` 7-segment red instead of a neon glow
- The race timer digits should keep a very thin black outline for contrast against the bright background
- The `RACE TIME` label should also use a very small black outline
- `LEADERBOARD`, `RECENT FINISHERS`, `START TIME`, and the start-time value should also use a very small black outline for readability
- The `Recent Finishers` title and cards are moved lower
- The latest-finisher cards should visually align with the bottom timing band more cleanly

## Recent Finisher Panel Direction

- The flat latest-runner cards were replaced with rolling recent-finisher panels
- The public view now uses:
  - one rolling male panel
  - one rolling female panel
- Each panel is driven by its own division-specific array
- This matches the event requirement that male and female database tables have independent numbering
- The newest finisher in each division is visually larger and anchored at the bottom of its panel
- The recent-finisher panels should follow the same theme as the leaderboard and timing cards, not a separate visual style
- The newest finisher name should stay readable and scale to fit instead of being truncated
- In the latest finisher row, the bib number should be the strongest visual emphasis: bigger and highlighted in a different color than the name
- The latest finisher bib should use a purple-to-magenta gradient fill with a white stroke, instead of a flat yellow
- The latest finisher bib and name should both use `Carter One`
- The latest finisher bib should keep only a thin white stroke, not a heavy outline
- The latest finisher name should use the earlier yellow highlight color
- In the latest finisher row, the bib and name should both use a small black outline, while the timestamp does not need that treatment
- Each division panel should show:
  - 2 history rows
  - 1 latest larger row
- This was chosen to keep the recent-finisher block inside the public display bounds
- Recent-finisher names should auto-fit to the available card width
- Font size should shrink dynamically based on available width, not only by a fixed character-count rule

## Leaderboard Visual Hierarchy

- In the leaderboard rows, the bib and runner name should use medal-style text colors by place:
  - 1st place = yellow/gold
  - 2nd place = silver
  - 3rd place = light bronze
- The 2nd-place silver should stay cool-toned and distinctly silver, not plain gray
- The 3rd-place bronze text should be slightly brighter so it stays readable against the darker leaderboard background
- Those leaderboard bib and name texts should also use the same very thin black outline for readability
- The main public-display cards should keep a stronger white outline, similar to the camera frame treatment, so the card edges read clearly from distance
