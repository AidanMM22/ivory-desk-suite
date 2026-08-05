import { appointments, locations, services, therapists } from "./data";
import { therapistShiftStatus, type TherapistShiftStatus } from "./therapist-shifts";
import type { Appointment, Room, Service, Therapist } from "./types";

export { therapistShiftStatus, type TherapistShiftStatus };

export interface LocatedRoom extends Room {
  locationId: string;
  locationName: string;
}

export const allRooms = (): LocatedRoom[] =>
  locations.flatMap((location) =>
    location.rooms.map((room) => ({
      ...room,
      status: room.status ?? "available",
      capacity: room.capacity ?? 1,
      internalNotes: room.internalNotes ?? "",
      locationId: location.id,
      locationName: location.name,
    })),
  );

export const roomIdsForService = (service: Service) =>
  service.roomIds ?? allRooms().map((room) => room.id);

export const therapistIdsForService = (service: Service) =>
  Array.from(
    new Set([
      ...(service.therapistIds ?? []),
      ...therapists
        .filter((therapist) => therapist.specialties.includes(service.key))
        .map((therapist) => therapist.id),
    ]),
  );

export const eligibleRooms = (service: Service) => {
  const roomIds = new Set(roomIdsForService(service));
  return allRooms().filter((room) => room.status === "available" && roomIds.has(room.id));
};

export const eligibleTherapists = (service: Service) => {
  const therapistIds = new Set(therapistIdsForService(service));
  return therapists.filter((therapist) => therapist.active && therapistIds.has(therapist.id));
};

export const servicesForRoom = (roomId: string) =>
  services.filter((service) => roomIdsForService(service).includes(roomId));

const appointmentEnd = (appointment: Appointment) => {
  const service = services.find((item) => item.key === appointment.serviceKey);
  const cleanup = service?.cleanupMinutes ?? 0;
  return new Date(appointment.start).getTime() + (appointment.duration + cleanup) * 60_000;
};

export const hasSchedulingConflict = ({
  start,
  duration,
  cleanupMinutes,
  roomId,
  therapistId,
  excludeAppointmentId,
}: {
  start: string;
  duration: number;
  cleanupMinutes: number;
  roomId: string;
  therapistId: string;
  excludeAppointmentId?: string;
}) => {
  const candidateStart = new Date(start).getTime();
  const candidateEnd = candidateStart + (duration + cleanupMinutes) * 60_000;
  return appointments.some((appointment) => {
    if (
      appointment.id === excludeAppointmentId ||
      appointment.status === "cancelled" ||
      appointment.status === "no_show"
    ) {
      return false;
    }
    if (appointment.roomId !== roomId && appointment.therapistId !== therapistId) return false;
    const existingStart = new Date(appointment.start).getTime();
    return candidateStart < appointmentEnd(appointment) && candidateEnd > existingStart;
  });
};

const resourceHasSchedulingConflict = ({
  start,
  duration,
  cleanupMinutes,
  matches,
}: {
  start: string;
  duration: number;
  cleanupMinutes: number;
  matches: (appointment: Appointment) => boolean;
}) => {
  const candidateStart = new Date(start).getTime();
  const candidateEnd = candidateStart + (duration + cleanupMinutes) * 60_000;
  return appointments.some((appointment) => {
    if (
      appointment.status === "cancelled" ||
      appointment.status === "no_show" ||
      !matches(appointment)
    ) {
      return false;
    }
    const existingStart = new Date(appointment.start).getTime();
    return candidateStart < appointmentEnd(appointment) && candidateEnd > existingStart;
  });
};

export const therapistHasSchedulingConflict = ({
  start,
  duration,
  cleanupMinutes,
  therapistId,
}: {
  start: string;
  duration: number;
  cleanupMinutes: number;
  therapistId: string;
}) =>
  resourceHasSchedulingConflict({
    start,
    duration,
    cleanupMinutes,
    matches: (appointment) => appointment.therapistId === therapistId,
  });

export const roomHasSchedulingConflict = ({
  start,
  duration,
  cleanupMinutes,
  roomId,
}: {
  start: string;
  duration: number;
  cleanupMinutes: number;
  roomId: string;
}) =>
  resourceHasSchedulingConflict({
    start,
    duration,
    cleanupMinutes,
    matches: (appointment) => appointment.roomId === roomId,
  });

export const therapistAvailableAt = (
  therapist: Therapist,
  start: string,
  duration: number,
  cleanupMinutes: number,
) => {
  const status = therapistShiftStatus(therapist, start, duration, cleanupMinutes);
  return status.startsDuringShift && !status.serviceEndsAfterShift && !status.cleanupEndsAfterShift;
};

export const futureAppointmentsForService = (serviceKey: string) =>
  appointments.filter(
    (appointment) =>
      appointment.serviceKey === serviceKey &&
      appointment.start >= new Date().toISOString() &&
      appointment.status !== "cancelled",
  );

export const futureAppointmentsForRoom = (roomId: string) =>
  appointments.filter(
    (appointment) =>
      appointment.roomId === roomId &&
      appointment.start >= new Date().toISOString() &&
      appointment.status !== "cancelled",
  );

export const futureAppointmentsForTherapist = (therapistId: string) =>
  appointments.filter(
    (appointment) =>
      appointment.therapistId === therapistId &&
      appointment.start >= new Date().toISOString() &&
      appointment.status !== "cancelled",
  );
