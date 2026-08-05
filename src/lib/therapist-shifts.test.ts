import assert from "node:assert/strict";
import test from "node:test";
import { therapistShiftStatus } from "./therapist-shifts.ts";

const therapist = {
  weeklyAvailability: [{ day: "Monday", unavailable: false, start: "09:00", end: "17:00" }],
};

const mondayAt = (time: string) => `2026-08-03T${time}:00`;

test("warns when the service itself ends after the shift", () => {
  assert.deepEqual(therapistShiftStatus(therapist, mondayAt("16:30"), 60, 15), {
    startsDuringShift: true,
    serviceEndsAfterShift: true,
    cleanupEndsAfterShift: false,
  });
});

test("uses the cleanup warning when only cleanup extends after the shift", () => {
  assert.deepEqual(therapistShiftStatus(therapist, mondayAt("16:00"), 60, 15), {
    startsDuringShift: true,
    serviceEndsAfterShift: false,
    cleanupEndsAfterShift: true,
  });
});

test("does not warn when service and cleanup end exactly with the shift", () => {
  assert.deepEqual(therapistShiftStatus(therapist, mondayAt("15:45"), 60, 15), {
    startsDuringShift: true,
    serviceEndsAfterShift: false,
    cleanupEndsAfterShift: false,
  });
});

test("does not make a therapist selectable outside their shift", () => {
  assert.deepEqual(therapistShiftStatus(therapist, mondayAt("17:00"), 30, 0), {
    startsDuringShift: false,
    serviceEndsAfterShift: false,
    cleanupEndsAfterShift: false,
  });
});

test("normalizes persisted numeric strings and twelve-hour shift values", () => {
  assert.deepEqual(
    therapistShiftStatus(
      {
        weeklyAvailability: [
          { day: "monday", unavailable: false, start: "9:00 AM", end: "5:00 PM" },
        ],
      },
      mondayAt("16:00"),
      "60" as unknown as number,
      "15" as unknown as number,
    ),
    {
      startsDuringShift: true,
      serviceEndsAfterShift: false,
      cleanupEndsAfterShift: true,
    },
  );
});

test("uses the editor's 9-to-5 default for legacy therapists without a saved schedule", () => {
  assert.deepEqual(therapistShiftStatus({}, mondayAt("16:30"), 45, 0), {
    startsDuringShift: true,
    serviceEndsAfterShift: true,
    cleanupEndsAfterShift: false,
  });
});
