# Debugging Session: Video Generator UI Interaction & Timeout Logic

## Status
- [OPEN] Issue reported
- [ ] Hypotheses formulated
- [ ] Instrumentation added
- [x] Evidence collected
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Verification passed
- [ ] Cleanup completed

## Issue Description
**Symptoms:**
1. **Infinite Loading**: User reports that after clicking "Generate Video", the button stays in "Generating..." state forever, even if the task should have finished or failed.
2. **Missing Loading Feedback**: When the API returns a Task ID and enters polling state, there is no visual feedback (loading animation) during the polling phase, or the logs don't update until the end.
3. **Timeout Handling**: If no response is received (or polling times out), it should end gracefully instead of spinning forever.

**Environment:**
-  (Client)
-  (Server)
-  (State)

## Hypotheses
1. **Hypothesis 1 (State Persistence vs Completion)**: The  state is set to  in . It is only set to  when  returns or throws. If the server action hangs (e.g. infinite polling loop in ), the client waits forever.
   - Wait, I increased the polling timeout to 10 minutes in .
   - If the user closes the tab and comes back,  is true (from store).
   - But the *promise* that would set it to  is lost (if tab closed).
   - **Correction**: User said "safe to leave logic added... clicked generate... button stays generating forever".
   - This means the "Safe to Leave" logic (Step 1) handles navigation *within* the app.
   - If the user stays on the page, the promise awaits.
   - If  polling loop takes 10 mins, the UI spins for 10 mins. This is correct behavior *if* the task is running.
   - **BUT**, the user might want intermediate feedback or the ability to cancel.
   - **Also**: "If API returns waiting, show loading animation".
   - Currently,  polls internally and only returns when .
   - **Improvement**:  should probably return the Task ID immediately, and let the *Client* (or a background job) poll?
   - If  holds the connection open for 10 minutes, Vercel Server Actions might time out (Vercel generic timeout is 10s-60s for Hobby, longer for Pro, but rarely 10 mins).
   - **Critical**: Vercel Server Actions have a max execution time. If  polls for >60s, the request will likely be terminated by the platform (Gateway Timeout 504).
   - When the request is terminated, the client receives an error (or network error).
   - If  catches it, it sets .
   - If the user navigated away, the promise rejection might not update the store correctly if the environment is torn down? No, safe-to-leave relies on the promise completing.
   - **Real Issue**: Server Action timeout. Polling for 10 mins in a single HTTP request is bad practice on Serverless.

2. **Hypothesis 2 (Client-Side Polling)**:
   - To support long-running tasks and "Safe to Leave" + "Real-time Logs", we should:
     1. Server Action submits task -> returns Task ID immediately.
     2. Client receives Task ID.
     3. Client (or Store) enters "Polling Mode".
     4. Client periodically calls a *status check* Server Action.
     5. This allows the UI to update logs ("Polling... status: running") and handles timeouts gracefully.
     6. It also survives page reloads if we store the  in the frame.

## Evidence Collection Plan
1. **Check Vercel Timeout**: Confirm if long-polling in Server Action is viable. (It's usually not).
2. **Review **: It currently . This blocks the response until done.

## Action Log
- 2026年 2月28日 星期六 11时07分29秒 CST: Session started.


## Analysis Update
- **Fact**: Vercel Hobby plan Serverless Function timeout is 10s (default) or max 60s. Pro is max 300s (5 mins).
- Video generation takes minutes.
- **Conclusion**: The current architecture (Server Action waits for completion) is **fundamentally broken** for this use case. The request WILL time out, and the client will be left hanging or get a 504.
- **Fix Requirement**:
  1. **Submit Task**: `generateVideoAction` should return `{ taskId, status: 'queued' }` immediately.
  2. **Poll Task**: Create a new Server Action `checkVideoTaskAction(taskId)`.
  3. **Client Logic**:
     - Call generate -> get ID.
     - Store ID in `frame.taskId`.
     - Start a client-side polling interval (e.g. `useInterval` or recursive `setTimeout`).
     - Update logs on each poll: "Status: running...".
     - When done, update `videoUrl` and clear `taskId`.
     - This also solves "Safe to Leave" perfectly: if user leaves and comes back, the component mounts, sees a `taskId` in the frame, and *resumes polling*.

## Detailed Fix Plan
1. **Modify **:
   -  should return  (string) instead of waiting.
   - Export a new method  that calls the GET endpoint once and returns the status/result.
2. **Modify **:
   - Update  to return .
   - Add  that calls .
3. **Modify **:
   - Add  to .
4. **Modify **:
   - Logic:
     - If  exists, start polling effect.
     - Polling effect: call  every 5s.
     - Log updates.
     - If done, .
     - If failed,  + log error.
   - :
     - Call generate -> .
     - The polling effect takes over.


