import { appointments, locations, services, therapists } from "./data";
import type { Appointment, Room, Service, Therapist } from "./types";

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
  service.therapistIds ??
  therapists
    .filter((therapist) => therapist.specialties.includes(service.key))
    .map((therapist) => therapist.id);

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

export const therapistAvailableAt = (
  therapist: Therapist,
  start: string,
  duration: number,
  cleanupMinutes: number,
) => {
  if (!therapist.weeklyAvailability) return true;
  const date = new Date(start);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = therapist.weeklyAvailability.find((entry) => entry.day === dayName);
  if (!day || day.unavailable) return false;
  const startMinutes = date.getHours() * 60 + date.getMinutes();
  const [startHour = 0, startMinute = 0] = day.start.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = day.end.split(":").map(Number);
  return (
    startMinutes >= startHour * 60 + startMinute &&
    startMinutes + duration + cleanupMinutes <= endHour * 60 + endMinute
  );
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
