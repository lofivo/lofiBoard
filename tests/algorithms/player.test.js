import { describe, expect, it } from "vitest";
import {
  ALGORITHM_PLAYER_PHASES,
  advanceAlgorithmPlayer,
  completeAlgorithmPlayer,
  createAlgorithmPlayerErrorSession,
  createAlgorithmPlayerSession,
  createAlgorithmTrace,
  getAlgorithmPlayerPhase,
  getAlgorithmPlayerStep,
  resetAlgorithmPlayer,
  rewindAlgorithmPlayer,
  setAlgorithmPlayerPlayback,
} from "../../src/algorithms/player.js";

function createTrace() {
  return createAlgorithmTrace({
    algorithm: "demo",
    label: "演示算法",
    initialState: { values: [3, 1], source: "input" },
    steps: [
      {
        type: "start",
        values: [3, 1],
        message: "开始",
        markers: { activeIndices: [0] },
        animation: { type: "focus" },
      },
      {
        type: "complete",
        state: { values: [1, 3], source: "result" },
        explanation: "完成",
        codeLine: 4,
        variables: { i: 1 },
      },
    ],
    metadata: { domain: "test" },
  });
}

describe("algorithm trace and player model", () => {
  it("normalizes common step fields without discarding domain-specific fields", () => {
    const trace = createTrace();

    expect(trace).toMatchObject({
      ok: true,
      algorithm: "demo",
      label: "演示算法",
      algorithmLabel: "演示算法",
      initialState: { values: [3, 1], source: "input" },
      metadata: { domain: "test" },
    });
    expect(trace.steps[0]).toMatchObject({
      index: 0,
      state: { values: [3, 1] },
      explanation: "开始",
      codeLine: null,
      variables: {},
      visual: {
        markers: { activeIndices: [0] },
        animation: { type: "focus" },
      },
    });
    expect(trace.steps[0].values).toEqual([3, 1]);
    expect(trace.steps[1]).toMatchObject({
      index: 1,
      state: { values: [1, 3], source: "result" },
      explanation: "完成",
      codeLine: 4,
      variables: { i: 1 },
    });
  });

  it("creates a serializable player session at the first step", () => {
    const trace = createTrace();
    const session = createAlgorithmPlayerSession(trace, { elementId: "array_1", speed: 2 });

    expect(session).toMatchObject({
      elementId: "array_1",
      algorithm: "demo",
      algorithmLabel: "演示算法",
      stepIndex: 0,
      stableStepIndex: 0,
      speed: 2,
      isPlaying: false,
      isAnimating: false,
      committed: false,
      error: "",
    });
    expect(getAlgorithmPlayerStep(session)).toMatchObject({ type: "start" });
    expect(getAlgorithmPlayerPhase(session)).toBe(ALGORITHM_PLAYER_PHASES.READY);
  });

  it("advances, rewinds, and stops playback at trace boundaries", () => {
    const initial = createAlgorithmPlayerSession(createTrace());
    const playing = setAlgorithmPlayerPlayback(initial, true);
    expect(playing.isPlaying).toBe(true);
    expect(getAlgorithmPlayerPhase(playing)).toBe(ALGORITHM_PLAYER_PHASES.PLAYING);

    const complete = advanceAlgorithmPlayer(playing);
    expect(complete.stepIndex).toBe(1);
    expect(complete.isPlaying).toBe(false);
    expect(getAlgorithmPlayerPhase(complete)).toBe(ALGORITHM_PLAYER_PHASES.COMPLETE);

    const rewound = rewindAlgorithmPlayer(complete);
    expect(rewound.stepIndex).toBe(0);
    expect(rewound.isPlaying).toBe(false);
    expect(resetAlgorithmPlayer(complete)).toMatchObject({
      stepIndex: 0,
      stableStepIndex: 0,
      committed: false,
    });
  });

  it("does not mutate a session while marking an animation phase", () => {
    const session = createAlgorithmPlayerSession(createTrace());
    const animating = {
      ...session,
      isAnimating: true,
    };

    expect(advanceAlgorithmPlayer(animating)).toBe(animating);
    expect(setAlgorithmPlayerPlayback(animating, true)).toBe(animating);
    expect(getAlgorithmPlayerPhase(animating)).toBe(ALGORITHM_PLAYER_PHASES.ANIMATING);
  });

  it("represents algorithm errors as a stable player state", () => {
    const session = createAlgorithmPlayerErrorSession({
      elementId: "array_1",
      algorithm: "demo",
      algorithmLabel: "演示算法",
      error: "输入无效",
    });

    expect(session.error).toBe("输入无效");
    expect(getAlgorithmPlayerPhase(session)).toBe(ALGORITHM_PLAYER_PHASES.ERROR);
    expect(completeAlgorithmPlayer(session)).toBe(session);
  });
});
